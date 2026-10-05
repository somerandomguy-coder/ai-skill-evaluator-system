import type { ReactNode } from "react";

/** Shared across every report template (the report, employer deck, and credential pages): the ambient background grid. */
export default function ReportLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="report-grid-bg" aria-hidden />
      {children}
    </>
  );
}
