/**
 * Client-side file storage for mock mode.
 * Stores files as base64 data URLs in localStorage under "harmoniq_files".
 */

const STORAGE_KEY = "harmoniq_files";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/csv",
]);

export interface StoredFile {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  entityType: string;
  entityId: string;
  uploadedAt: string;
  uploadedBy: string;
}

function getAllFiles(): StoredFile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAllFiles(files: StoredFile[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
  } catch (err) {
    if (
      err instanceof DOMException &&
      (err.name === "QuotaExceededError" || err.code === 22)
    ) {
      throw new Error("QUOTA_EXCEEDED");
    }
    console.warn("[Harmoniq] Failed to save files:", err);
  }
}

export class FileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FileValidationError";
  }
}

// Magic bytes for image MIME type validation
const IMAGE_MAGIC_BYTES: Record<string, number[][]> = {
  "image/png": [[0x89, 0x50, 0x4e, 0x47]],
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/gif": [[0x47, 0x49, 0x46]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]], // RIFF header
};

async function validateImageMagicBytes(file: File): Promise<void> {
  const expectedPatterns = IMAGE_MAGIC_BYTES[file.type];
  if (!expectedPatterns) return; // Not an image type — skip magic byte check

  const headerSize = Math.max(...expectedPatterns.map((p) => p.length));
  const buffer = await file.slice(0, headerSize).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  const matches = expectedPatterns.some((pattern) =>
    pattern.every((byte, i) => bytes[i] === byte),
  );

  if (!matches) {
    throw new FileValidationError(
      `File "${file.name}" content does not match its declared type "${file.type}". The file may be corrupted or mislabeled.`,
    );
  }
}

/** Store a File object. Rejects files > 5 MB or with unsupported MIME types. */
export async function storeFile(
  file: File,
  entityType: string,
  entityId: string,
  uploadedBy: string,
): Promise<StoredFile> {
  if (file.size > MAX_FILE_SIZE) {
    throw new FileValidationError(
      `File "${file.name}" exceeds the 5 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB).`,
    );
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    throw new FileValidationError(
      `File type "${file.type || "unknown"}" is not supported. Allowed: PNG, JPG, GIF, WebP, PDF, CSV.`,
    );
  }

  // Validate image magic bytes before storing
  await validateImageMagicBytes(file);

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

  const storedFile: StoredFile = {
    id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: file.name,
    type: file.type,
    size: file.size,
    dataUrl,
    entityType,
    entityId,
    uploadedAt: new Date().toISOString(),
    uploadedBy,
  };

  const all = getAllFiles();
  all.push(storedFile);
  saveAllFiles(all); // may throw QUOTA_EXCEEDED

  return storedFile;
}

/** Get all files attached to a specific entity. */
export function getFilesForEntity(
  entityType: string,
  entityId: string,
): StoredFile[] {
  return getAllFiles().filter(
    (f) => f.entityType === entityType && f.entityId === entityId,
  );
}

/** Get a single file by its ID. */
export function getFileById(fileId: string): StoredFile | null {
  return getAllFiles().find((f) => f.id === fileId) ?? null;
}

/** Delete a file by its ID. */
export function deleteFile(fileId: string): void {
  const all = getAllFiles().filter((f) => f.id !== fileId);
  saveAllFiles(all);
}

/** Return the data URL for viewing / downloading, or null. */
export function getFileUrl(fileId: string): string | null {
  return getFileById(fileId)?.dataUrl ?? null;
}

/** Trigger a browser download for a stored file. */
export function downloadFile(storedFile: StoredFile): void {
  const link = document.createElement("a");
  link.href = storedFile.dataUrl;
  link.download = storedFile.name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Seed mock certification files into storage (idempotent).
 * Call once during app initialization.
 */
export function seedMockCertificationFiles(): void {
  if (typeof window === "undefined") return;
  const all = getAllFiles();
  const alreadySeeded = all.some((f) => f.id.startsWith("mock_cert_"));
  if (alreadySeeded) return;

  const mockCerts: StoredFile[] = [
    {
      id: "mock_cert_safety",
      name: "Safety Certificate SC-2024-0891.pdf",
      type: "application/pdf",
      size: 156_000,
      dataUrl:
        "data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovUmVzb3VyY2VzIDw8Ci9Gb250IDw8Ci9GMSBbNiAwIFJdCj4+Cj4+Ci9Db250ZW50cyA1IDAgUgo+PgplbmRvYmoKNCAwIG9iago8PAovTGVuZ3RoIDE1Mwo+PgpzdHJlYW0KQlQKL0YxIDI0IFRmCjEwMCA3MDAgVGQKKFNhZmV0eSBDZXJ0aWZpY2F0ZSkgVGoKL0YxIDEyIFRmCjEwMCA2NTAgVGQKKENlcnQgTm86IFNDLTI0LTA4OTEpIFRqCjEwMCA2MjAgVGQKKElzc3VlZCBieTogT1NIQSkgVGoKMTAwIDU5MCBUZAooVmFsaWQgdGhyb3VnaDogMjAyNS0wNi0xNSkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iago1IDAgb2JqCjQgMCBSCmVuZG9iago2IDAgb2JqCjw8Ci9UeXBlIC9Gb250Ci9TdWJ0eXBlIC9UeXBlMQovQmFzZUZvbnQgL0hlbHZldGljYQo+PgplbmRvYmoKeHJlZgowIDcKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNjYgMDAwMDAgbiAKMDAwMDAwMDE3MyAwMDAwMCBuIAowMDAwMDAwMzEyIDAwMDAwIG4gCjAwMDAwMDA1MTUgMDAwMDAgbiAKMDAwMDAwMDUzNiAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDcKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjYxOAolJUVPRgo=",
      entityType: "asset",
      entityId: "asset_1",
      uploadedAt: "2024-01-10T09:00:00Z",
      uploadedBy: "user_4",
    },
    {
      id: "mock_cert_calibration",
      name: "Calibration Report CAL-2023-1204.pdf",
      type: "application/pdf",
      size: 89_000,
      dataUrl:
        "data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovUmVzb3VyY2VzIDw8Ci9Gb250IDw8Ci9GMSBbNiAwIFJdCj4+Cj4+Ci9Db250ZW50cyA1IDAgUgo+PgplbmRvYmoKNCAwIG9iago8PAovTGVuZ3RoIDE3Mgo+PgpzdHJlYW0KQlQKL0YxIDI0IFRmCjEwMCA3MDAgVGQKKENhbGlicmF0aW9uIFJlcG9ydCkgVGoKL0YxIDEyIFRmCjEwMCA2NTAgVGQKKENlcnQgTm86IENBTC0yMDIzLTEyMDQpIFRqCjEwMCA2MjAgVGQKKElzc3VlZCBieTogSVNPIENhbGlicmF0aW9uIExhYikgVGoKMTAwIDU5MCBUZAooVmFsaWQgdGhyb3VnaDogMjAyNC0wMi0yOCkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iago1IDAgb2JqCjQgMCBSCmVuZG9iago2IDAgb2JqCjw8Ci9UeXBlIC9Gb250Ci9TdWJ0eXBlIC9UeXBlMQovQmFzZUZvbnQgL0hlbHZldGljYQo+PgplbmRvYmoKeHJlZgowIDcKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNjYgMDAwMDAgbiAKMDAwMDAwMDE3MyAwMDAwMCBuIAowMDAwMDAwMzEyIDAwMDAwIG4gCjAwMDAwMDA1MzQgMDAwMDAgbiAKMDAwMDAwMDU1NSAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDcKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjYzNwolJUVPRgo=",
      entityType: "asset",
      entityId: "asset_1",
      uploadedAt: "2024-01-05T11:30:00Z",
      uploadedBy: "user_4",
    },
    {
      id: "mock_cert_iso",
      name: "ISO 45001 Compliance ISO-45001-2287.pdf",
      type: "application/pdf",
      size: 234_000,
      dataUrl:
        "data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovUmVzb3VyY2VzIDw8Ci9Gb250IDw8Ci9GMSBbNiAwIFJdCj4+Cj4+Ci9Db250ZW50cyA1IDAgUgo+PgplbmRvYmoKNCAwIG9iago8PAovTGVuZ3RoIDE4Mgo+PgpzdHJlYW0KQlQKL0YxIDI0IFRmCjEwMCA3MDAgVGQKKElTTyA0NTAwMSBDb21wbGlhbmNlKSBUagovRjEgMTIgVGYKMTAwIDY1MCBUZAooQ2VydCBObzogSVNPLTQ1MDAxLTIyODcpIFRqCjEwMCA2MjAgVGQKKElzc3VlZCBieTogQlNJIEdyb3VwKSBUagorMTAwIDU5MCBUZAooVmFsaWQgdGhyb3VnaDogMjAyNS0xMi0zMSkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iago1IDAgb2JqCjQgMCBSCmVuZG9iago2IDAgb2JqCjw8Ci9UeXBlIC9Gb250Ci9TdWJ0eXBlIC9UeXBlMQovQmFzZUZvbnQgL0hlbHZldGljYQo+PgplbmRvYmoKeHJlZgowIDcKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNjYgMDAwMDAgbiAKMDAwMDAwMDE3MyAwMDAwMCBuIAowMDAwMDAwMzEyIDAwMDAwIG4gCjAwMDAwMDA1NDQgMDAwMDAgbiAKMDAwMDAwMDU2NSAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDcKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjY0NwolJUVPRgo=",
      entityType: "asset",
      entityId: "asset_1",
      uploadedAt: "2024-01-02T14:00:00Z",
      uploadedBy: "user_4",
    },
  ];

  const updated = [...all, ...mockCerts];
  saveAllFiles(updated);
}
