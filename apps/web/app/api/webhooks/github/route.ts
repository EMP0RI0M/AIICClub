import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseAdmin } from "@/shared/supabase/admin";
import { verifyGitHubWebhookSignature } from "@/shared/lib/github/webhooks/verify";
import { resolveInstallationRecord, syncInstallationFromWebhook } from "@/shared/lib/github/installations";
import { syncRepositoryFromWebhook } from "@/shared/lib/github/repositories";
import { dispatchGitHubEvent } from "@/shared/lib/github/webhooks/dispatcher";

export async function POST(req: NextRequest) {
    // ─── 1. RAW INGESTION ────────────────────────────────────────────────
    let rawBody = "";
    try {
        rawBody = await req.text();
    } catch {
        return NextResponse.json({ error: "Failed to read request body." }, { status: 400 });
    }

    const signatureHeader = req.headers.get("x-hub-signature-256");
    const deliveryId = req.headers.get("x-github-delivery");
    const eventName = req.headers.get("x-github-event");

    if (!deliveryId || !eventName) {
        return NextResponse.json(
            { error: "Missing required GitHub headers (X-GitHub-Delivery or X-GitHub-Event)." },
            { status: 400 }
        );
    }

    // ─── 2. CRYPTOGRAPHIC HMAC-SHA256 VERIFICATION ───────────────────────
    const verification = verifyGitHubWebhookSignature(rawBody, signatureHeader);
    if (!verification.valid) {
        console.warn(`[WEBHOOK_HMAC_REJECTED] Delivery: ${deliveryId} Reason: ${verification.reason}`);
        return NextResponse.json({ error: verification.reason || "Unauthorized signature." }, { status: 401 });
    }

    // Parse JSON body after verification
    let payload: any = {};
    try {
        payload = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    // ─── 3. INSTALLATION PROVISIONING & RESOLUTION ───────────────────────
    const externalInstId = payload.installation?.id || payload.installation_id || 0;
    const supabase = getSupabaseAdmin();

    let installationRecord = await resolveInstallationRecord(externalInstId);
    let lastProvisionError: any = null;
    let lastSanitizedPayload: any = null;

    // If installation event or installation record not in database, provision it immediately
    if (
        !installationRecord ||
        eventName === "installation" ||
        eventName === "installation_repositories"
    ) {
        const syncRes = await syncInstallationFromWebhook(payload);
        installationRecord = syncRes.record;
        lastProvisionError = syncRes.error;
        lastSanitizedPayload = syncRes.sanitizedPayload;
    }

    if (!installationRecord && eventName !== "ping") {
        return NextResponse.json(
            {
                error: `Unable to provision GitHub installation #${externalInstId}.`,
                installation_id: externalInstId,
                postgres_error: lastProvisionError ? {
                    code: lastProvisionError.code,
                    message: lastProvisionError.message,
                    details: lastProvisionError.details,
                    hint: lastProvisionError.hint,
                } : null,
                payload_fields: lastSanitizedPayload,
            },
            { status: 500 }
        );
    }

    const installationRecordId = installationRecord?.id;

    // ─── 4. REPOSITORY SYNCHRONIZATION FOR INSTALLATION EVENTS ───────────
    const reposToSync = payload.repositories || payload.repositories_added || (payload.repository ? [payload.repository] : []);
    if (installationRecord && reposToSync.length > 0) {
        for (const repo of reposToSync) {
            try {
                await syncRepositoryFromWebhook(repo, installationRecord.id);
            } catch (err: any) {
                console.warn("[REPO_SYNC_WARNING]", err?.message);
            }
        }
    }

    // ─── 5. ATOMIC DELIVERY INSERT & IDEMPOTENCY CHECK ───────────────────
    const payloadHash = crypto.createHash("sha256").update(rawBody, "utf-8").digest("hex");
    const action = payload.action || null;

    try {
        const { data: inserted, error: insertErr } = await supabase
            .from("github_webhook_deliveries")
            .insert({
                delivery_id: deliveryId,
                installation_record_id: installationRecordId || null,
                external_installation_id: externalInstId,
                event_type: eventName,
                action: action,
                payload_hash: payloadHash,
                status: "processing",
                attempt_count: 1,
            })
            .select("delivery_id")
            .maybeSingle();

        if (insertErr) {
            // Check for duplicate primary key collision (already processed)
            if (insertErr.code === "23505" || insertErr.message?.includes("duplicate key")) {
                return NextResponse.json(
                    { status: "already_processed", delivery_id: deliveryId },
                    { status: 200 }
                );
            }
            console.error("[WEBHOOK_DELIVERY_INSERT_ERROR]", insertErr);
        }

        if (!inserted) {
            // Already processed by concurrent request
            return NextResponse.json(
                { status: "already_processed", delivery_id: deliveryId },
                { status: 200 }
            );
        }

        // ─── 6. DISPATCH & AUTOMATION EXECUTION ──────────────────────────
        const normalized = await dispatchGitHubEvent(
            eventName,
            payload,
            deliveryId,
            installationRecordId || ""
        );

        // Update delivery status to completed
        await supabase
            .from("github_webhook_deliveries")
            .update({
                status: "completed",
                processed_at: new Date().toISOString(),
            })
            .eq("delivery_id", deliveryId);

        // Record governance audit log
        try {
            await supabase.from("aiic_audit_logs").insert({
                actor_user_id: "cca73bdd-e2ba-4aa3-b300-8c244de335a8",
                action: "GITHUB_WEBHOOK_PROCESSED",
                category: "integration",
                entity_type: "github_webhook_delivery",
                entity_id: deliveryId,
                metadata: {
                    delivery_id: deliveryId,
                    event_type: eventName,
                    action,
                    repository: normalized?.repositoryFullName || null,
                    installation_id: externalInstId,
                },
            });
        } catch (auditErr: any) {
            console.warn("[AUDIT_LOG_WARNING]", auditErr?.message);
        }

        return NextResponse.json({
            success: true,
            delivery_id: deliveryId,
            event: eventName,
            status: "completed",
        });
    } catch (err: any) {
        console.error("[WEBHOOK_PROCESSING_FAILED]", err);

        const sanitizedCode = (err.code || "ERR_PROCESSING").slice(0, 64);
        const sanitizedMessage = (err.message || "Internal processing error").slice(0, 512);

        await supabase
            .from("github_webhook_deliveries")
            .update({
                status: "failed",
                error_code: sanitizedCode,
                error_message: sanitizedMessage,
                processed_at: new Date().toISOString(),
            })
            .eq("delivery_id", deliveryId);

        return NextResponse.json(
            { error: "Webhook processing encountered an error.", delivery_id: deliveryId, details: sanitizedMessage },
            { status: 500 }
        );
    }
}
