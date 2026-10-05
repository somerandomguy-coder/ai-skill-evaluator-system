"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import type { SkillDefinition } from "@/lib/skills/types";
import { PRESET_SKILLS, parseSkillMarkdown, slugifySkillId } from "@/lib/skills/registry";

const STORAGE_KEY = "codecraft_registered_skills_v1";

export function useSkills() {
  const [skills, setSkills] = useState<SkillDefinition[]>(PRESET_SKILLS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load stored custom skills on mount and merge with built-in presets
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const custom: SkillDefinition[] = JSON.parse(stored);
        if (Array.isArray(custom)) {
          // Merge: presets first, then any custom skills not colliding with presets
          const presetMap = new Map(PRESET_SKILLS.map((s) => [s.id, s]));
          const merged: SkillDefinition[] = [...PRESET_SKILLS];

          for (const item of custom) {
            if (item && item.id && !presetMap.has(item.id)) {
              merged.push({ ...item, isPreset: false });
            }
          }
          setSkills(merged);
        }
      }
    } catch (e) {
      console.warn("[useSkills] Failed to load custom skills from localStorage:", e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save custom skills to localStorage
  const saveCustomSkills = useCallback((currentSkills: SkillDefinition[]) => {
    try {
      const customOnly = currentSkills.filter((s) => !s.isPreset);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customOnly));
    } catch (e) {
      console.warn("[useSkills] Failed to persist custom skills:", e);
    }
  }, []);

  const addSkill = useCallback(
    (skill: SkillDefinition): { success: boolean; error?: string } => {
      const cleanId = slugifySkillId(skill.id);
      if (!cleanId) {
        return { success: false, error: "Skill ID must contain at least one valid character (no spaces)." };
      }

      let updated: SkillDefinition[] = [];
      setSkills((prev) => {
        // If skill exists, replace it (unless it's a built-in preset)
        const isPreset = PRESET_SKILLS.some((p) => p.id === cleanId);
        if (isPreset) {
          return prev; // Cannot overwrite preset directly
        }

        const filtered = prev.filter((s) => s.id !== cleanId);
        updated = [...filtered, { ...skill, id: cleanId, isPreset: false }];
        saveCustomSkills(updated);
        return updated;
      });

      return { success: true };
    },
    [saveCustomSkills]
  );

  const removeSkill = useCallback(
    (id: string) => {
      setSkills((prev) => {
        const target = prev.find((s) => s.id === id);
        if (target?.isPreset) {
          return prev; // Cannot delete preset skills
        }
        const updated = prev.filter((s) => s.id !== id);
        saveCustomSkills(updated);
        return updated;
      });
    },
    [saveCustomSkills]
  );

  const resetToPresets = useCallback(() => {
    setSkills(PRESET_SKILLS);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const registerFromMarkdown = useCallback(
    (content: string, fallbackId?: string) => {
      const parsed = parseSkillMarkdown(content, fallbackId);
      if (!parsed.success || !parsed.skill) {
        return { success: false, error: parsed.error || "Failed to parse skill markdown." };
      }
      return addSkill(parsed.skill);
    },
    [addSkill]
  );

  const skillMap = useMemo(() => new Map(skills.map((s) => [s.id, s])), [skills]);

  return {
    skills,
    skillMap,
    isLoaded,
    addSkill,
    removeSkill,
    resetToPresets,
    registerFromMarkdown,
  };
}
