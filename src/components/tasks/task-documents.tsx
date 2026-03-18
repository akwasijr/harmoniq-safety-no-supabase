"use client";

import React from "react";
import { FileText, Upload, File, Download, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";
import {
  storeFile,
  getFilesForEntity,
  downloadFile,
  deleteFile,
} from "@/lib/file-storage";
import type { StoredFile } from "@/lib/file-storage";

interface TaskDocumentsProps {
  entityType: string;
  entityId: string;
  formatDate: (date: string | Date, options?: Intl.DateTimeFormatOptions) => string;
}

export function TaskDocuments({ entityType, entityId, formatDate }: TaskDocumentsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = React.useState<StoredFile[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setDocuments(getFilesForEntity(entityType, entityId));
  }, [entityType, entityId]);

  const handleUpload = React.useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !user) return;
      try {
        const stored = await storeFile(file, entityType, entityId, user.id);
        setDocuments((prev) => [...prev, stored]);
        toast("File uploaded", "success");
      } catch (err) {
        toast(err instanceof Error ? err.message : "Upload failed", "error");
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [entityType, entityId, user, toast],
  );

  const handleDelete = React.useCallback(
    (fileId: string) => {
      deleteFile(fileId);
      setDocuments((prev) => prev.filter((f) => f.id !== fileId));
      toast("File removed", "success");
    },
    [toast],
  );

  return (
    <div className="space-y-4">
      {/* Upload */}
      <Card>
        <CardContent className="p-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp,application/pdf,text/csv"
            className="hidden"
            onChange={handleUpload}
          />
          <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Upload File
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            PNG, JPG, GIF, WebP, PDF, CSV — max 5 MB
          </p>
        </CardContent>
      </Card>

      {/* File list */}
      {documents.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Files ({documents.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <File className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(doc.size / 1024).toFixed(0)} KB • {formatDate(doc.uploadedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => downloadFile(doc)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(doc.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-4 mb-3">
            <FileText className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="text-sm text-muted-foreground">No files attached</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Upload documents, photos, or reports</p>
        </div>
      )}
    </div>
  );
}
