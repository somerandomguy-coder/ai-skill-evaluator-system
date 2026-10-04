"use client";

import { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

interface AiMessageMarkdownProps {
  content: string;
  isStreaming?: boolean;
  className?: string;
}

/** Formats common mathematical notation and LaTeX symbols used by DeepSeek */
export function formatMathAndLatex(raw: string): string {
  if (!raw) return "";

  // 1. Convert display math blocks $$ ... $$ into clean highlighted math callouts
  let processed = raw.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
    const clean = math
      .replace(/\\Delta/g, "Δ")
      .replace(/\\approx/g, "≈")
      .replace(/\\times/g, "×")
      .replace(/\\le/g, "≤")
      .replace(/\\ge/g, "≥")
      .replace(/\\ne/g, "≠")
      .replace(/\\rightarrow/g, "→")
      .replace(/\^2/g, "²")
      .replace(/\^3/g, "³")
      .replace(/\\text\{([^}]+)\}/g, "$1")
      .replace(/\\mathbf\{([^}]+)\}/g, "$1")
      .replace(/\\math[a-zA-Z]+\{([^}]+)\}/g, "$1")
      .trim();
    return `\n\n> 📐 **Formula:** *${clean}*\n\n`;
  });

  // 2. Convert inline math $ ... $ into bold math notation
  processed = processed.replace(/\$([^\$\n]+?)\$/g, (_, math) => {
    const clean = math
      .replace(/\\Delta/g, "Δ")
      .replace(/\\approx/g, "≈")
      .replace(/\\times/g, "×")
      .replace(/\\le/g, "≤")
      .replace(/\\ge/g, "≥")
      .replace(/\\ne/g, "≠")
      .replace(/\\rightarrow/g, "→")
      .replace(/\^2/g, "²")
      .replace(/\^3/g, "³")
      .replace(/\\text\{([^}]+)\}/g, "$1")
      .replace(/\\mathbf\{([^}]+)\}/g, "$1")
      .replace(/\\math[a-zA-Z]+\{([^}]+)\}/g, "$1")
      .trim();
    return `**${clean}**`;
  });

  return processed;
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard fallback
    }
  };

  return (
    <div className="group relative my-3 overflow-hidden rounded-xl border border-border/80 bg-surface-container-lowest shadow-xs">
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-3 py-1.5 text-[11px] font-mono text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Terminal className="size-3 text-primary" />
          <span className="font-semibold uppercase tracking-wider text-[10px] text-primary">
            {language || "code"}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium transition-colors hover:bg-muted hover:text-foreground"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="size-3 text-emerald-500" />
              <span className="text-emerald-500 font-semibold text-[10px]">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="size-3" />
              <span className="text-[10px]">Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="overflow-x-auto p-3.5 font-mono text-[12.5px] leading-relaxed text-foreground">
        <pre className="m-0 p-0 bg-transparent">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

export function AiMessageMarkdown({ content, isStreaming, className }: AiMessageMarkdownProps) {
  const formattedContent = useMemo(() => formatMathAndLatex(content), [content]);

  return (
    <div className={cn("text-[13.5px] leading-relaxed text-foreground/95 [overflow-wrap:anywhere]", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const isInline = !match && !String(children).includes("\n");

            if (isInline) {
              return (
                <code
                  className="rounded-md border border-border/70 bg-muted/60 px-1.5 py-0.5 font-mono text-[0.88em] font-medium text-foreground"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            const language = match ? match[1] : "code";
            const codeString = String(children).replace(/\n$/, "");

            return <CodeBlock language={language} code={codeString} />;
          },
          pre({ children }) {
            return <>{children}</>;
          },
          strong({ children }) {
            return <strong className="font-bold text-foreground">{children}</strong>;
          },
          em({ children }) {
            return <em className="italic text-foreground/90">{children}</em>;
          },
          h1({ children }) {
            return <h3 className="mt-4 mb-2 text-base font-bold text-foreground">{children}</h3>;
          },
          h2({ children }) {
            return <h4 className="mt-3.5 mb-1.5 text-[14px] font-bold text-foreground">{children}</h4>;
          },
          h3({ children }) {
            return <h5 className="mt-3 mb-1 text-[13px] font-semibold text-foreground">{children}</h5>;
          },
          p({ children }) {
            return <p className="mb-2 last:mb-0 leading-relaxed text-foreground/90">{children}</p>;
          },
          ul({ children }) {
            return <ul className="mb-2.5 space-y-1 pl-4 list-disc marker:text-primary/70">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="mb-2.5 space-y-1 pl-4 list-decimal marker:text-primary/70">{children}</ol>;
          },
          li({ children }) {
            return <li className="pl-0.5 leading-relaxed text-foreground/90">{children}</li>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="my-2 border-l-2 border-primary/50 bg-primary/5 pl-3 py-1 text-xs text-muted-foreground rounded-r-md">
                {children}
              </blockquote>
            );
          },
          table({ children }) {
            return (
              <div className="my-2.5 overflow-x-auto rounded-lg border border-border/70">
                <table className="w-full text-xs text-left border-collapse">{children}</table>
              </div>
            );
          },
          th({ children }) {
            return <th className="border-b border-border/80 bg-muted/50 p-2 font-semibold text-foreground">{children}</th>;
          },
          td({ children }) {
            return <td className="border-b border-border/50 p-2 text-muted-foreground">{children}</td>;
          },
        }}
      >
        {formattedContent}
      </ReactMarkdown>
      {isStreaming && formattedContent.trim().length > 0 && (
        <span className="inline-block w-1.5 h-3.5 ml-1 bg-signal animate-pulse align-middle" />
      )}
    </div>
  );
}
