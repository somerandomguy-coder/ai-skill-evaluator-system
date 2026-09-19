import { Loader2 } from "lucide-react";

export default function BuildLoading() {
  return (
    <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 animate-pulse">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
          Initializing Studio Workspace...
        </p>
      </div>
    </div>
  );
}
