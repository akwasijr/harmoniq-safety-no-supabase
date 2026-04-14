"use client";

export interface Draft {
  id: string;
  type: "checklist" | "risk_assessment";
  template_id: string;
  template_name: string;
  responses: Record<string, unknown>;
  progress: number;
  updated_at: string;
  created_at: string;
}

const DRAFTS_KEY = "harmoniq_drafts";

export function getDrafts(): Draft[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(DRAFTS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function getDraft(id: string): Draft | null {
  return getDrafts().find((d) => d.id === id) || null;
}

export function saveDraft(draft: Draft): void {
  const drafts = getDrafts().filter((d) => d.id !== draft.id);
  drafts.unshift({ ...draft, updated_at: new Date().toISOString() });
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts.slice(0, 20)));
}

export function deleteDraft(id: string): void {
  const drafts = getDrafts().filter((d) => d.id !== id);
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
}

export function getDraftsForType(type: Draft["type"]): Draft[] {
  return getDrafts().filter((d) => d.type === type);
}
