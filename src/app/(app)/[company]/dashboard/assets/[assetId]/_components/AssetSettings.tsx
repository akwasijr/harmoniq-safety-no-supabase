"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n";
import type { Asset } from "@/types";

interface AssetSettingsProps {
  asset: Asset;
  company: string;
  onRetire: () => void;
  onDelete: () => void;
}

export function AssetSettings({ asset, company, onRetire, onDelete }: AssetSettingsProps) {
  const { t } = useTranslation();

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="text-base text-destructive">{t("assets.sections.dangerZone")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="font-medium">Mark as Retired</p>
            <p className="text-sm text-muted-foreground">
              Retire this asset. It will no longer appear in active lists.
            </p>
          </div>
          <Button variant="outline" onClick={onRetire}>
            {t("assets.buttons.retireAsset")}
          </Button>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-destructive/50 p-4 bg-destructive/5">
          <div>
            <p className="font-medium text-destructive">{t("assets.buttons.deleteAsset")}</p>
            <p className="text-sm text-muted-foreground">
              Permanently delete this asset and all its data. This action cannot be undone.
            </p>
          </div>
          <Button
            variant="destructive"
            className="gap-2"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
