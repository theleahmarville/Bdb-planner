import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Paperclip,
  FileText,
  Image as ImageIcon,
  X,
  Loader2,
  Download,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface SectionAttachmentsProps {
  /** Unique key identifying this section, e.g. "annual-2026-biggoals" */
  sectionKey: string;
  /** Parent section name for storage path, e.g. "annual" */
  section: string;
  /** Label shown on the attach button */
  label?: string;
  /** Whether to show the panel expanded by default */
  defaultOpen?: boolean;
}

export default function SectionAttachments({
  sectionKey,
  section,
  label = "Attachments",
  defaultOpen = false,
}: SectionAttachmentsProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: attachments = [], refetch } = trpc.attachments.list.useQuery(
    { sectionKey },
    { enabled: open }
  );

  const addMutation = trpc.attachments.add.useMutation({
    onSuccess: () => refetch(),
  });

  const deleteMutation = trpc.attachments.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (fileInputRef.current) fileInputRef.current.value = "";

    for (const file of files) {
      const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
      if (!allowed.includes(file.type)) {
        toast.error(`File type not supported: ${file.name}`);
        continue;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`File too large (max 20MB): ${file.name}`);
        continue;
      }

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("section", section);

        const res = await fetch("/api/upload/attachment", {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Upload failed");
        }

        const data = await res.json();
        await addMutation.mutateAsync({
          section,
          sectionKey,
          fileUrl: data.url,
          fileKey: data.fileKey,
          fileName: data.fileName,
          fileType: data.fileType,
          fileSizeBytes: data.fileSizeBytes,
        });
        toast.success(`${file.name} attached`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Upload failed";
        toast.error(message);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleDelete = async (id: number, fileName: string) => {
    if (!confirm(`Remove "${fileName}"?`)) return;
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Attachment removed");
    } catch {
      toast.error("Failed to remove attachment. Please try again.");
    }
  };

  const formatSize = (bytes?: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileType: string) => {
    if (fileType === "pdf") return <FileText className="w-4 h-4 text-red-500" />;
    return <ImageIcon className="w-4 h-4 text-blue-500" />;
  };

  return (
    <div className="mt-3 border border-dashed border-border rounded-lg overflow-hidden">
      {/* Header toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5" />
          {label}
          {attachments.length > 0 && (
            <span className="bg-primary/10 text-primary rounded-full px-1.5 py-0.5 text-[10px] font-medium">
              {attachments.length}
            </span>
          )}
        </span>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2">
          {/* File list */}
          {attachments.length > 0 && (
            <div className="space-y-1.5">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 group"
                >
                  {getFileIcon(att.fileType)}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{att.fileName}</p>
                    {att.fileSizeBytes && (
                      <p className="text-[10px] text-muted-foreground">{formatSize(att.fileSizeBytes)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                      href={att.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-[44px] min-h-[44px] rounded flex items-center justify-center hover:bg-muted transition-colors"
                      title="Open"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href={att.fileUrl}
                      download={att.fileName}
                      className="min-w-[44px] min-h-[44px] rounded flex items-center justify-center hover:bg-muted transition-colors"
                      title="Download"
                    >
                      <Download className="w-3 h-3" />
                    </a>
                    <button
                      onClick={() => handleDelete(att.id, att.fileName)}
                      className="min-w-[44px] min-h-[44px] rounded flex items-center justify-center hover:bg-red-100 hover:text-red-500 transition-colors"
                      title="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upload button */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5 w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> Uploading...</>
              ) : (
                <><Paperclip className="w-3 h-3" /> Attach PDF or Image</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
