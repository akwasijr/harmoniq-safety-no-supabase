"use client";

import { ProfileSkeleton } from "@/components/ui/loading";
import { useAuth } from "@/hooks/use-auth";

export default function ProfileLoading() {
  const { user } = useAuth();
  if (user) return null;
  return <ProfileSkeleton />;
}
