"use client";

import { AssetsSkeleton } from "@/components/ui/loading";
import { useAssetsStore } from "@/stores/assets-store";

export default function AssetsLoading() {
  const { items } = useAssetsStore({ skipLoad: true });
  if (items.length > 0) return null;
  return <AssetsSkeleton />;
}
