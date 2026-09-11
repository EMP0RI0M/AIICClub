"use client";

import { StudioWorkspaceShell } from "@/features/studio/components/StudioWorkspaceShell";

export default function StudioPage() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-[#07090e]">
      <StudioWorkspaceShell
        projectId="corvus-default-vm"
        projectName="Corvus Next.js App"
        previewUrl="https://corvus-preview.freestyle.sh"
      />
    </div>
  );
}
