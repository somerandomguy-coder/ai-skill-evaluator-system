"use client";

import { useState } from "react";
import type { SkillDefinition } from "@/lib/skills/types";
import { parseSkillMarkdown, slugifySkillId } from "@/lib/skills/registry";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Plus,
  Trash2,
  Check,
  ChevronDown,
  ChevronUp,
  X,
  RotateCcw,
  BookOpen,
  Terminal,
  Globe,
  Loader2,
  FileCode,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  skills: SkillDefinition[];
  onAddSkill: (skill: SkillDefinition) => { success: boolean; error?: string };
  onRemoveSkill: (id: string) => void;
  onResetPresets: () => void;
  onSelectSkillToInsert?: (skillId: string) => void;
}

export function SkillRegisterModal({
  isOpen,
  onClose,
  skills,
  onAddSkill,
  onRemoveSkill,
  onResetPresets,
  onSelectSkillToInsert,
}: Props) {
  const [activeTab, setActiveTab] = useState<"list" | "create">("list");
  const [expandedSkillId, setExpandedSkillId] = useState<string | null>(null);

  // Form state for creating custom skill
  const [markdownInput, setMarkdownInput] = useState("");
  const [customId, setCustomId] = useState("");
  const [customName, setCustomName] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleMarkdownChange = (val: string) => {
    setMarkdownInput(val);
    setFormError(null);
    if (!val.trim()) return;

    // Auto-parse on paste
    const parsed = parseSkillMarkdown(val);
    if (parsed.success && parsed.skill) {
      setCustomId(parsed.skill.id);
      setCustomName(parsed.skill.name);
      setCustomDesc(parsed.skill.description);
      setCustomPrompt(parsed.skill.prompt);
    }
  };

  const handleFetchUrl = async () => {
    if (!urlInput.trim()) return;
    setFormError(null);
    setIsFetchingUrl(true);
    try {
      const res = await fetch(urlInput.trim());
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const text = await res.text();
      setMarkdownInput(text);
      handleMarkdownChange(text);
      setFormSuccess("Skill fetched successfully from URL!");
      setTimeout(() => setFormSuccess(null), 3000);
    } catch (err: any) {
      setFormError(`Failed to load from URL: ${err.message || "Network error"}`);
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanId = slugifySkillId(customId);
    if (!cleanId) {
      setFormError("Skill ID is required and must contain no spaces (e.g. 'threat-model').");
      return;
    }
    if (!customPrompt.trim()) {
      setFormError("Skill prompt / rules cannot be empty.");
      return;
    }

    const newSkill: SkillDefinition = {
      id: cleanId,
      name: customName.trim() || cleanId,
      description: customDesc.trim() || `Custom steering skill /${cleanId}`,
      prompt: customPrompt.trim(),
      category: "custom",
      isPreset: false,
    };

    const res = onAddSkill(newSkill);
    if (!res.success) {
      setFormError(res.error || "Failed to register skill.");
      return;
    }

    // Reset form and switch to list view
    setMarkdownInput("");
    setCustomId("");
    setCustomName("");
    setCustomDesc("");
    setCustomPrompt("");
    setUrlInput("");
    setActiveTab("list");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Skill Register"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0 bg-muted/30">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-signal-soft text-signal-ink">
              <Sparkles className="size-4.5" />
            </span>
            <div>
              <h2 className="text-base font-semibold leading-tight flex items-center gap-2">
                <span>Skill Register</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-signal/15 text-signal font-medium">
                  {skills.length} available
                </span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Steer the AI with slash commands like <code className="text-[11px] font-mono font-semibold text-foreground">/grill-me</code> or <code className="text-[11px] font-mono font-semibold text-foreground">/prototype</code>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close modal"
          >
            <X className="size-4.5" />
          </button>
        </div>

        {/* Segmented Navigation */}
        <div className="flex items-center justify-between px-5 pt-3 border-b border-border/60 bg-muted/10 shrink-0">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("list")}
              className={cn(
                "pb-2.5 text-xs font-semibold px-2 transition-all relative border-b-2 select-none",
                activeTab === "list"
                  ? "border-signal text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Registered Skills ({skills.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("create")}
              className={cn(
                "pb-2.5 text-xs font-semibold px-2 transition-all relative border-b-2 select-none flex items-center gap-1.5",
                activeTab === "create"
                  ? "border-signal text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Plus className="size-3" />
              <span>Register New Skill</span>
            </button>
          </div>

          {activeTab === "list" && (
            <button
              type="button"
              onClick={onResetPresets}
              className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 pb-2 transition-colors"
              title="Reset to default preset skills"
            >
              <RotateCcw className="size-3" />
              <span>Reset Defaults</span>
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 min-h-0 space-y-4">
          {activeTab === "list" ? (
            <div className="space-y-3">
              {skills.map((skill) => {
                const isExpanded = expandedSkillId === skill.id;
                return (
                  <div
                    key={skill.id}
                    className="group rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/30 transition-all p-3.5 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-signal px-2 py-0.5 rounded-md bg-signal-soft border border-signal/20 select-all">
                            /{skill.id}
                          </span>
                          <span className="text-sm font-semibold text-foreground">
                            {skill.name}
                          </span>
                          {skill.isPreset ? (
                            <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-full bg-sky-500/10 text-sky-500 border border-sky-500/20">
                              Built-in
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                              Custom
                            </span>
                          )}
                          {skill.author && (
                            <span className="text-[11px] text-muted-foreground">
                              by {skill.author}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {skill.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {onSelectSkillToInsert && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2 font-mono gap-1"
                            onClick={() => {
                              onSelectSkillToInsert(skill.id);
                              onClose();
                            }}
                            title={`Insert /${skill.id} into chat`}
                          >
                            <Terminal className="size-3" />
                            <span>Use</span>
                          </Button>
                        )}
                        {!skill.isPreset && (
                          <button
                            type="button"
                            onClick={() => onRemoveSkill(skill.id)}
                            className="size-7 rounded-lg grid place-items-center text-muted-foreground hover:text-bad hover:bg-bad-soft transition-colors"
                            title="Delete custom skill"
                            aria-label={`Delete custom skill ${skill.name}`}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setExpandedSkillId(isExpanded ? null : skill.id)}
                          className="size-7 rounded-lg grid place-items-center text-muted-foreground hover:bg-muted transition-colors"
                          title={isExpanded ? "Hide prompt rules" : "View prompt rules"}
                          aria-label={isExpanded ? "Hide prompt rules" : "View prompt rules"}
                        >
                          {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Prompt Preview */}
                    {isExpanded && (
                      <div className="pt-2 border-t border-border/50 text-[11.5px] font-mono text-muted-foreground bg-surface-container-low rounded-lg p-3 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                        {skill.prompt}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Optional URL Import */}
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Globe className="size-3.5 text-muted-foreground" />
                  <span>Import from URL (optional)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://raw.githubusercontent.com/.../SKILL.md"
                    className="flex-1 h-8 rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-signal"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={handleFetchUrl}
                    disabled={isFetchingUrl || !urlInput.trim()}
                  >
                    {isFetchingUrl ? <Loader2 className="size-3 animate-spin" /> : <BookOpen className="size-3" />}
                    <span>Fetch</span>
                  </Button>
                </div>
              </div>

              {/* Paste SKILL.md */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FileCode className="size-3.5 text-muted-foreground" />
                    <span>Paste SKILL.md or Markdown Rules</span>
                  </span>
                  <span className="text-[11px] text-muted-foreground font-normal">
                    Supports YAML frontmatter (name, description, author)
                  </span>
                </label>
                <textarea
                  rows={4}
                  value={markdownInput}
                  onChange={(e) => handleMarkdownChange(e.target.value)}
                  placeholder={`---\nname: threat-model\ndescription: Audit boundaries and precision\n---\nYou are a zero-trust reviewer...`}
                  className="w-full rounded-xl border border-border bg-background p-3 font-mono text-xs outline-none focus:border-signal resize-y"
                />
              </div>

              {/* Parsed Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Command Name <span className="text-bad">*</span>
                  </label>
                  <div className="flex items-center rounded-lg border border-border bg-background px-2.5 h-8">
                    <span className="text-xs font-mono text-signal font-bold select-none mr-1">/</span>
                    <input
                      type="text"
                      value={customId}
                      onChange={(e) => setCustomId(slugifySkillId(e.target.value))}
                      placeholder="e.g. threat-model"
                      required
                      className="w-full bg-transparent text-xs font-mono outline-none"
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    No spaces. Used in chat as <code className="font-mono">/{customId || "skill"}</code>
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Threat Model Reviewer"
                    className="w-full h-8 rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-signal"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Description
                </label>
                <input
                  type="text"
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                  placeholder="e.g. Interrogates data structures and float precision before building"
                  className="w-full h-8 rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-signal"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  System Prompt Instructions <span className="text-bad">*</span>
                </label>
                <textarea
                  rows={4}
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="You are an uncompromising software architect. Refuse to write code until..."
                  required
                  className="w-full rounded-xl border border-border bg-background p-3 font-mono text-xs outline-none focus:border-signal resize-y"
                />
              </div>

              {formError && (
                <div className="rounded-lg bg-bad-soft text-bad p-2.5 text-xs font-medium border border-bad/20">
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="rounded-lg bg-ok-soft text-ok p-2.5 text-xs font-medium border border-ok/20 flex items-center gap-1.5">
                  <Check className="size-3.5" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("list")}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  variant="signal"
                  className="h-8 text-xs font-semibold gap-1.5"
                >
                  <Plus className="size-3.5" />
                  <span>Save & Register Skill</span>
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
