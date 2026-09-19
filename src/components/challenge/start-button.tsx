"use client";

import { useState, useRef } from "react";
import { LoaderCircle, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

export function StartBuildButton() {
  const [pending, setPending] = useState(false);
  const clickedRef = useRef(false);

  return (
    <Button
      type="submit"
      size="lg"
      disabled={pending}
      className="w-full gap-2"
      onClick={(e) => {
        if (clickedRef.current) {
          e.preventDefault();
          return;
        }
        clickedRef.current = true;
        setPending(true);
      }}
    >
      {pending ? (
        <>
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
          <span>Opening workspace...</span>
        </>
      ) : (
        <>
          <Play className="size-4" aria-hidden />
          <span>Start building</span>
        </>
      )}
    </Button>
  );
}
