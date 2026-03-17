"use client";

import { FileText, X } from "lucide-react";

interface PreviewModalProps {
  previewDoc: { url: string; name: string } | null;
  previewImage: { url: string; name: string } | null;
  onClose: () => void;
  getFileType: (name: string) => string;
}

export function PreviewModal({ previewDoc, previewImage, onClose, getFileType }: PreviewModalProps) {
  if (!previewDoc && !previewImage) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative bg-background rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-medium text-sm truncate">{(previewDoc || previewImage)?.name}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 flex items-center justify-center">
          {previewImage ? (
            <img src={previewImage.url} alt={previewImage.name} className="max-h-[75vh] max-w-full object-contain" />
          ) : previewDoc && getFileType(previewDoc.name) === 'pdf' ? (
            <iframe src={previewDoc.url} className="w-full h-[75vh] border-0" />
          ) : previewDoc && getFileType(previewDoc.name) === 'image' ? (
            <img src={previewDoc.url} alt={previewDoc.name} className="max-h-[75vh] max-w-full object-contain" />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Preview not available for this file type</p>
              <p className="text-sm mt-1">Click download to view the file</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
