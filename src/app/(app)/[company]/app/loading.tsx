"use client";

import { HomeSkeleton } from "@/components/ui/loading";
import { useContentStore } from "@/stores/content-store";
import { useAssetsStore } from "@/stores/assets-store";

export default function AppLoading() {
  const { items: content } = useContentStore({ skipLoad: true });
  const { items: assets } = useAssetsStore({ skipLoad: true });
  // If any store already has data, skip the skeleton entirely
  if (content.length > 0 || assets.length > 0) return null;
  return <HomeSkeleton />;
}
