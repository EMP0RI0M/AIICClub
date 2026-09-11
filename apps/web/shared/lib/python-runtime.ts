/**
 * Python Execution Bridge for Corvus AI.
 * Communicates with the pre-warmed Python serverless engine or local runtime.
 */

export interface PythonExecutionResult {
    success: boolean;
    stdout: string;
    stderr: string;
    error: string | null;
    data?: {
        result?: string;
        image_base64?: string;
        file_base64?: string;
        mime_type?: string;
    };
}

export async function runPythonCode(code: string, params: Record<string, any> = {}): Promise<PythonExecutionResult> {
    try {
        const origin = typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || "https://aiic-bbs.vercel.app");
        const res = await fetch(`${origin}/api/python_exec`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                code,
                params,
            }),
        });

        if (!res.ok) {
            return {
                success: false,
                stdout: "",
                stderr: "",
                error: `HTTP ${res.status}: Failed to reach Python runtime`,
            };
        }

        const data = await res.json();
        return data;
    } catch (err: any) {
        return {
            success: false,
            stdout: "",
            stderr: "",
            error: err.message || "Failed to execute Python",
        };
    }
}
