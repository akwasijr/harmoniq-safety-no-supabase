"use client";

import { HomeSkeleton } from "@/components/ui/loading";
import { useContentStore } from "@/stores/content-store";

export default function AppLoading() {
  const { items } = useContentStore({ skipLoad: true });
  if (items.length > 0) return null;
  return <HomeSkeleton />;
}
