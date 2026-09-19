/**
 * Google and GitHub sign-in. No OAuth provider is configured in this app, so the
 * buttons are rendered disabled rather than pretending to work; wire them to a
 * provider and drop the `disabled` / "soon" tag to switch them on.
 */
const GoogleMark = () => (
  <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
    <path
      fill="#4285F4"
      d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8Z"
    />
    <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-3l-3.9-3a7.2 7.2 0 0 1-10.7-3.8h-4v3.1A12 12 0 0 0 12 24Z" />
    <path fill="#FBBC05" d="M5.3 14.3a7.1 7.1 0 0 1 0-4.6v-3.1h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
    <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8Z" />
  </svg>
);

const GitHubMark = () => (
  <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden>
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
);

const PROVIDERS = [
  { label: "Google", mark: <GoogleMark /> },
  { label: "GitHub", mark: <GitHubMark /> },
];

export function OAuthButtons() {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {PROVIDERS.map((p) => (
        <button
          key={p.label}
          type="button"
          disabled
          title={`${p.label} sign-in isn't connected yet`}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-foreground/[0.04] text-[13px] font-medium transition-all duration-200 hover:border-signal/50 hover:bg-signal-soft/60 disabled:cursor-not-allowed disabled:opacity-55 dark:bg-white/5"
        >
          {p.mark}
          {p.label}
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">soon</span>
        </button>
      ))}
    </div>
  );
}
