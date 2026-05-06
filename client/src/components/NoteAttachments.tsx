import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Paperclip, Image, FileText, Trash2, Loader2, X, ZoomIn } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface NoteAttachmentsProps {
  noteId: number;
  isLocked?: boolean;
}

interface UploadedFile {
  url: string;
  fileKey: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  isImage: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function NoteAttachments({ noteId, isLocked }: NoteAttachmentsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const { data: attachments = [], isLoading } = trpc.notes.listAttachments.useQuery(
    { noteId },
    { enabled: !isLocked }
  );

  const deleteAttachment = trpc.notes.deleteAttachment.useMutation({
    onSuccess: () => {
      utils.notes.listAttachments.invalidate({ noteId });
      toast.success("Attachment removed");
    },
    onError: () => toast.error("Failed to remove attachment"),
  });

  const addAttachment = trpc.notes.addAttachment.useMutation({
    onSuccess: () => {
      utils.notes.listAttachments.invalidate({ noteId });
    },
    onError: () => toast.error("Failed to save attachment"),
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      toast.error("Only images (JPEG, PNG, GIF, WebP) and PDFs are supported");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File must be under 20MB");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("noteId", String(noteId));

      const res = await fetch("/api/upload/note-attachment", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error || "Upload failed");
      }

      const uploaded: UploadedFile = await res.json();
      await addAttachment.mutateAsync({
        noteId,
        fileUrl: uploaded.url,
        fileKey: uploaded.fileKey,
        fileName: uploaded.fileName,
        fileType: uploaded.fileType,
        fileSizeBytes: uploaded.fileSizeBytes,
      });
      toast.success(`${uploaded.isImage ? "Image" : "PDF"} attached`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      toast.error(message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (isLocked) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground border-t border-border">
        <Paperclip size={12} />
        <span>Attachments hidden — unlock note to view</span>
      </div>
    );
  }

  const images = attachments.filter(a => a.fileType.startsWith("image/"));
  const pdfs = attachments.filter(a => !a.fileType.startsWith("image/"));

  return (
    <div className="border-t border-border">
      {/* Toolbar row */}
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <Paperclip size={12} />
          Attachments {attachments.length > 0 && `(${attachments.length})`}
        </span>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors",
            "bg-muted hover:bg-accent text-foreground disabled:opacity-50"
          )}
        >
          {uploading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Paperclip size={12} />
          )}
          {uploading ? "Uploading…" : "Attach file"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
          <Loader2 size={12} className="animate-spin" /> Loading attachments…
        </div>
      )}

      {/* Image grid */}
      {images.length > 0 && (
        <div className="px-3 pb-3">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {images.map(img => (
              <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-muted">
                <img
                  src={img.fileUrl}
                  alt={img.fileName}
                  className="w-full h-full object-cover"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => setLightboxUrl(img.fileUrl)}
                    className="min-w-[44px] min-h-[44px] rounded-full bg-white/90 text-black hover:bg-white transition-colors flex items-center justify-center"
                    title="View full size"
                  >
                    <ZoomIn size={12} />
                  </button>
                  <button
                    onClick={() => deleteAttachment.mutate({ attachmentId: img.id })}
                    className="min-w-[44px] min-h-[44px] rounded-full bg-white/90 text-red-600 hover:bg-white transition-colors flex items-center justify-center"
                    title="Remove"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                {/* File name tooltip */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] px-1.5 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                  {img.fileName}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PDF list */}
      {pdfs.length > 0 && (
        <div className="px-3 pb-3 space-y-1.5">
          {pdfs.map(pdf => (
            <div key={pdf.id} className="flex items-center gap-2.5 p-2 rounded-lg border border-border bg-muted/40 group">
              <div className="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0">
                <FileText size={16} className="text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <a
                  href={pdf.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-foreground hover:underline truncate block"
                >
                  {pdf.fileName}
                </a>
                {pdf.fileSizeBytes && (
                  <p className="text-[10px] text-muted-foreground">{formatBytes(pdf.fileSizeBytes)}</p>
                )}
              </div>
              <button
                onClick={() => deleteAttachment.mutate({ attachmentId: pdf.id })}
                className="min-w-[44px] min-h-[44px] rounded text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 flex items-center justify-center"
                title="Remove"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && attachments.length === 0 && (
        <div className="px-3 pb-3 flex flex-col items-center gap-1.5 py-4 text-center">
          <div className="flex gap-2 text-muted-foreground/40">
            <Image size={20} />
            <FileText size={20} />
          </div>
          <p className="text-xs text-muted-foreground">No attachments yet</p>
          <p className="text-[10px] text-muted-foreground/60">Attach photos or PDFs to this note</p>
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            onClick={() => setLightboxUrl(null)}
          >
            <X size={20} />
          </button>
          <img
            src={lightboxUrl}
            alt="Full size"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
