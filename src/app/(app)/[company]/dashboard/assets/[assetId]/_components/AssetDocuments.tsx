"use client";

import * as React from "react";
import {
  Award,
  Download,
  Eye,
  ExternalLink,
  File,
  FileCheck,
  FileText,
  Image as ImageIcon,
  Shield,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n";

interface StoredDocument {
  id: string;
  name: string;
  type: string;
  size: string;
  uploaded: string;
  dataUrl?: string;
}

interface StoredImage {
  id: string;
  name: string;
  uploaded: string;
  dataUrl?: string;
}

interface Certification {
  id: string;
  name: string;
  certType: string;
  certNumber: string;
  issuingAuthority: string;
  expiry: string;
  status: "valid" | "expiring" | "expired";
}

interface AssetDocumentsProps {
  certifications: Certification[];
  storedDocuments: StoredDocument[];
  storedImages: StoredImage[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  imageInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, kind: "document" | "image") => void;
  setPreviewDoc: (doc: { url: string; name: string } | null) => void;
  setPreviewImage: (img: { url: string; name: string } | null) => void;
  onDeleteFile?: (fileId: string) => void;
}

export function AssetDocuments({
  certifications,
  storedDocuments,
  storedImages,
  fileInputRef,
  imageInputRef,
  handleFileUpload,
  setPreviewDoc,
  setPreviewImage,
  onDeleteFile,
}: AssetDocumentsProps) {
  const { t, formatDate } = useTranslation();
  const [docsSubTab, setDocsSubTab] = React.useState<"certifications" | "documents" | "images">("certifications");

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
        onChange={(e) => handleFileUpload(e, "document")}
      />
      <input
        ref={imageInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        onChange={(e) => handleFileUpload(e, "image")}
      />

      {/* Sub-tabs & Upload Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(["certifications", "documents", "images"] as const).map((tab) => (
            <Button
              key={tab}
              size="sm"
              variant={docsSubTab === tab ? "default" : "outline"}
              onClick={() => setDocsSubTab(tab)}
            >
              {tab === "certifications" ? t("assets.sections.certifications") : tab === "documents" ? t("assets.sections.documents") : t("assets.sections.images")}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => imageInputRef.current?.click()}>
            <ImageIcon className="h-4 w-4" />
            {t("assets.buttons.uploadImage")}
          </Button>
          <Button className="gap-2" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" />
            {t("assets.buttons.uploadFile")}
          </Button>
        </div>
      </div>

      {/* Certifications Sub-tab */}
      {docsSubTab === "certifications" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4" />
              {t("assets.sections.certifications")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {certifications.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">{t("assets.empty.noCertifications")}</p>
            ) : (
              <div className="space-y-2">
                {certifications.map((cert) => {
                  const CertIcon = cert.certType === "safety" ? Shield : cert.certType === "quality" ? Award : FileCheck;
                  const statusVariant = cert.status === "valid" ? "success" : cert.status === "expiring" ? "warning" : "destructive";
                  const iconColor = cert.status === "valid" ? "text-green-600" : cert.status === "expiring" ? "text-amber-500" : "text-red-500";
                  return (
                    <div key={cert.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <CertIcon className={`h-5 w-5 ${iconColor}`} />
                        <div>
                          <p className="font-medium">{cert.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {cert.certNumber}{cert.issuingAuthority ? ` • ${cert.issuingAuthority}` : ""} • Expires: {formatDate(cert.expiry)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const matchingDoc = storedDocuments.find(d => d.name.toLowerCase().includes(cert.name.toLowerCase().split(" ")[0]));
                          return matchingDoc?.dataUrl ? (
                            <Button variant="ghost" size="sm" title="View document" onClick={() => setPreviewDoc({ url: matchingDoc.dataUrl!, name: matchingDoc.name })}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          ) : null;
                        })()}
                        <Badge variant={statusVariant as "success" | "warning" | "destructive"} className="text-xs">
                          {t(`assets.certStatus.${cert.status}`)}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Documents Sub-tab */}
      {docsSubTab === "documents" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <File className="h-4 w-4" />
              {t("assets.sections.documents")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {storedDocuments.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">{t("assets.empty.noDocuments")}</p>
            ) : (
              <div className="space-y-2">
                {storedDocuments.map((doc) => {
                  const ext = doc.name.split(".").pop()?.toLowerCase() || "";
                  const DocIcon = ["pdf"].includes(ext) ? FileText : ["doc", "docx"].includes(ext) ? FileText : ["xls", "xlsx", "csv"].includes(ext) ? FileText : File;
                  const iconColor = ["pdf"].includes(ext) ? "text-red-500" : ["doc", "docx"].includes(ext) ? "text-blue-500" : ["xls", "xlsx", "csv"].includes(ext) ? "text-green-500" : "text-muted-foreground";
                  return (
                    <div key={doc.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <DocIcon className={`h-5 w-5 ${iconColor}`} />
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">{doc.size} • {formatDate(doc.uploaded)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {doc.dataUrl && (
                          <Button variant="ghost" size="sm" title="Open in new tab" onClick={() => {
                            window.open(doc.dataUrl, "_blank");
                          }}>
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" title={t("assets.download")} onClick={() => {
                          if (doc.dataUrl) {
                            const link = document.createElement("a");
                            link.href = doc.dataUrl;
                            link.download = doc.name;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }
                        }}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="View" onClick={() => {
                          if (doc.dataUrl) setPreviewDoc({ url: doc.dataUrl, name: doc.name });
                        }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {onDeleteFile && (
                          <Button variant="ghost" size="sm" title="Delete" className="text-destructive hover:text-destructive" onClick={() => onDeleteFile(doc.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Images Sub-tab */}
      {docsSubTab === "images" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              {t("assets.sections.images")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {storedImages.map((img) => (
                <div
                  key={img.id}
                  className="group relative aspect-square rounded-lg border bg-muted overflow-hidden cursor-pointer"
                  onClick={() => {
                    if (img.dataUrl) setPreviewImage({ url: img.dataUrl, name: img.name });
                  }}
                >
                  {img.dataUrl ? (
                    <img src={img.dataUrl} alt={img.name} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">{t("assets.noPreview")}</span>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur p-2 flex items-center justify-between">
                    <p className="text-xs font-medium truncate">{img.name}</p>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {img.dataUrl && (
                        <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                      {onDeleteFile && (
                        <button
                          type="button"
                          title="Delete image"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80"
                          onClick={(e) => { e.stopPropagation(); onDeleteFile(img.id); }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <button
                className="aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                onClick={() => imageInputRef.current?.click()}
              >
                <Upload className="h-6 w-6" />
                <span className="text-xs">Upload</span>
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
