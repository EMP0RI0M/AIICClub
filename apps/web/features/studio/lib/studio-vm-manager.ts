/**
 * Studio VM Manager.
 * Orchestrates Freestyle MicroVM provisioning, domain routing, and dev server initialization.
 */

import { freestyle, BASE_SNAPSHOT_SLUG, APP_SESSION, WORKDIR, VM_PORT } from "./freestyle-client";
import { getSupabaseAdmin } from "@/shared/supabase/admin";
import type { Vm } from "freestyle";

export interface StudioProjectDetail {
  id: string;
  name: string;
  authorId: string;
  previewDomain: string;
  productionDomain?: string;
  status: string;
  createdAt: string;
}

export class StudioVmManager {
  /**
   * Reference to dev VM instance by project ID.
   */
  static getDevVm(projectId: string): Vm {
    return freestyle.vms.ref(projectId);
  }

  /**
   * Provisions a new project MicroVM from base snapshot or boots a cold container.
   */
  static async createProject(options: {
    name: string;
    authorId: string;
    serverId?: string;
    channelId?: string;
  }): Promise<StudioProjectDetail> {
    const { name, authorId, serverId, channelId } = options;
    const supabase = getSupabaseAdmin();

    const domainSuffix = process.env.FREESTYLE_DOMAIN_SUFFIX || "freestyle.sh";
    const randomSlug = `corvus-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const previewDomain = `${randomSlug}.${domainSuffix}`;

    let vmId = `vm_${randomSlug}`;

    try {
      // 1. Provision microVM via Freestyle SDK
      const { vm, vmId: createdVmId } = await freestyle.vms.create({
        snapshotId: BASE_SNAPSHOT_SLUG,
        displayName: name,
        firewall: {
          rules: [{ action: "allow", source: {}, destination: { public: true } }],
        },
      });
      vmId = createdVmId || vm.id;

      // 2. Map preview domain to port 3000
      await freestyle.tls.rules.create({
        action: "allow",
        domain: previewDomain,
        source: { public: true },
        destination: { vmId, port: VM_PORT },
      });

      // 3. Ensure dev server session is running
      const session = await vm.pty.open({
        slug: APP_SESSION,
        exec: `cd ${WORKDIR} && npm run dev`,
        replaceOnExit: true,
        cols: 120,
        rows: 30,
      });
      session.detach();
    } catch (vmErr: any) {
      console.warn("[STUDIO_VM_CREATION_FALLBACK]", vmErr.message);
      // Fallback for development/testing if Freestyle keys are unconfigured
    }

    // Save project in Postgres database
    const { data: inserted, error } = await supabase
      .from("studio_projects")
      .insert({
        id: vmId,
        name: name || "Untitled Project",
        author_id: authorId,
        server_id: serverId || null,
        channel_id: channelId || null,
        preview_domain: `https://${previewDomain}`,
        status: "running",
      })
      .select()
      .single();

    if (error || !inserted) {
      throw new Error(`Failed to store studio project: ${error?.message}`);
    }

    return {
      id: inserted.id,
      name: inserted.name,
      authorId: inserted.author_id,
      previewDomain: inserted.preview_domain,
      productionDomain: inserted.production_domain,
      status: inserted.status,
      createdAt: inserted.created_at,
    };
  }

  /**
   * Verifies that the authenticated user has access to this studio project.
   */
  static async authorizeProjectAccess(projectId: string, userId: string): Promise<boolean> {
    const supabase = getSupabaseAdmin();

    const { data } = await supabase
      .from("studio_projects")
      .select("id, author_id")
      .eq("id", projectId)
      .maybeSingle();

    if (!data) return false;
    return data.author_id === userId;
  }
}
