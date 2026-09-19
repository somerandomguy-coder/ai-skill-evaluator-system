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
        <SheetHeader>
          <SheetTitle>{challenge.title}</SheetTitle>
          <SheetDescription>
            About {formatTimebox(challenge.timeboxMinutes)} · {challenge.requirements.length} requirements · {challenge.rubricVersion}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-10 px-4 pb-10">
          <section>
            <Markdown>{challenge.brief}</Markdown>
          </section>
          <section className="space-y-4">
            <h3 className="text-base font-semibold">What you&apos;re scored on</h3>
            <p className="text-sm text-muted-foreground">Reasoning and decisions. Never grammar, spelling or fluency.</p>
            <Rubric requirements={challenge.requirements} compact />
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
