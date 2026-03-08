"use client";

import { TasksSkeleton } from "@/components/ui/loading";
import { useChecklistTemplatesStore } from "@/stores/checklists-store";

export default function ChecklistsLoading() {
  const { items } = useChecklistTemplatesStore({ skipLoad: true });
  if (items.length > 0) return null;
  return <TasksSkeleton />;
}
