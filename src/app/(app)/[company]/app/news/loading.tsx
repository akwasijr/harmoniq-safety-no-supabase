"use client";

import { NewsSkeleton } from "@/components/ui/loading";
import { useContentStore } from "@/stores/content-store";

export default function NewsLoading() {
  const { items } = useContentStore({ skipLoad: true });
  if (items.length > 0) return null;
  return <NewsSkeleton />;
}
