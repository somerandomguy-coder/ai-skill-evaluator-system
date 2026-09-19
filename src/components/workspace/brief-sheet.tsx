"use client";

import { Rubric } from "@/components/challenge/rubric";
import { Markdown } from "@/components/common/markdown";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { WorkspaceView } from "@/lib/data/types";
import { formatTimebox } from "@/lib/format";

/** The brief and the rubric, always one click away while building: nothing is hidden. */
export function BriefSheet({ challenge, open, onOpenChange }: { challenge: WorkspaceView["challenge"]; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-3xl">
        <SheetHeader className="border-b border-border px-5 py-4 sm:px-6">
          <SheetTitle className="font-title pr-8 text-lg text-balance">{challenge.title}</SheetTitle>
          <SheetDescription className="flex flex-wrap gap-x-3 gap-y-1">
            <span>About {formatTimebox(challenge.timeboxMinutes)}</span>
            <span>{challenge.requirements.length} requirements</span>
            <span className="font-mono text-xs">{challenge.rubricVersion}</span>
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-10 px-5 py-6 sm:px-6">
          <section>
            <Markdown>{challenge.brief}</Markdown>
          </section>
          <section className="space-y-4">
            <div className="space-y-1">
              <h3 className="font-title text-base">How you&apos;re scored</h3>
              <p className="text-[13px] text-muted-foreground">Reasoning and decisions. Never grammar, spelling or fluency.</p>
            </div>
            <Rubric requirements={challenge.requirements} compact />
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
