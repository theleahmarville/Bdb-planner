/**
 * SectionToolbar — sits at the TOP of each annual planning section.
 * Provides:
 *   • 📎 File attachments (PDF / images) — visible upload button
 *   • 🔗 Link embedding (Google Sheets, Excel Online, any URL)
 * Stored in the existing sectionAttachments table via the attachments tRPC router.
 */
import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Paperclip,
  Link2,
  FileText,
  Image as ImageIcon,
  X,
  Loader2,
  ExternalLink,
  Sheet,
  Globe,
  ChevronDown,
  ChevronUp,
  Plus,
} from "lucide-react";

interface SectionToolbarProps {
  sectionKey: string;
  section: string;
}

type AttachmentType = "pdf" | "image" | "google_sheet" | "excel_sheet" | "link";

function detectLinkType(url: string): { type: AttachmentType; label: string } {
  try {
    const u = new URL(url);
    if (u.hostname.includes("docs.google.com") && u.pathname.includes("spreadsheets"))
      return { type: "google_sheet", label: "Google Sheet" };
    if (u.hostname.includes("docs.google.com"))
      return { type: "link", label: "Google Doc" };
    if (u.hostname.includes("sharepoint.com") || u.hostname.includes("onedrive.live.com") || url.includes(".xlsx"))
      return { type: "excel_sheet", label: "Excel Sheet" };
  } catch {/* bad URL */ }
  return { type: "link", label: "Link" };
}

function LinkTypeIcon({ type }: { type: string }) {
  if (type === "google_sheet") return <Sheet className="w-4 h-4 text-emerald-600" />;
  if (type === "excel_sheet") return <Sheet className="w-4 h-4 text-green-700" />;
  if (type === "pdf") return <FileText className="w-4 h-4 text-red-500" />;
  if (type === "image") return <ImageIcon className="w-4 h-4 text-blue-500" />;
  return <Globe className="w-4 h-4 text-sky-500" />;
}

export default function SectionToolbar({ sectionKey, section }: SectionToolbarProps) {
  const [showAll, setShowAll] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [uploading, setUploading] = useState(false);
  const [addingLink, setAddingLink] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: attachments = [], refetch } = trpc.attachments.list.useQuery({ sectionKey });

  const addMutation = trpc.attachments.add.useMutation({ onSuccess: () => refetch() });
  const deleteMutation = trpc.attachments.delete.useMutation({ onSuccess: () => refetch() });

  const files = attachments.filter(a => a.fileType === "pdf" || a.fileType === "image" || a.fileType.startsWith("image/") || a.fileType === "application/pdf");
  const links = attachments.filter(a => a.fileType === "google_sheet" || a.fileType === "excel_sheet" || a.fileType === "link");
  const totalCount = attachments.length;

  // ── File upload ──────────────────────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files ?? []);
    if (fileInputRef.current) fileInputRef.current.value = "";
    for (const file of selectedFiles) {
      const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
      if (!allowed.includes(file.type)) { toast.error(`Not supported: ${file.name}`); continue; }
      if (file.size > 20 * 1024 * 1024) { toast.error(`Too large (max 20MB): ${file.name}`); continue; }
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("section", section);
        const res = await fetch("/api/upload/attachment", { method: "POST", body: formData, credentials: "include" });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Upload failed"); }
        const data = await res.json();
        await addMutation.mutateAsync({
          section, sectionKey,
          fileUrl: data.url, fileKey: data.fileKey,
          fileName: data.fileName, fileType: data.fileType,
          fileSizeBytes: data.fileSizeBytes,
        });
        toast.success(`${file.name} attached`);
      } catch (err: any) {
        toast.error(err?.message ?? "Upload failed");
      } finally {
        setUploading(false);
      }
    }
  };

  // ── Link save ────────────────────────────────────────────────────────────────
  const handleAddLink = async () => {
    const url = linkUrl.trim();
    if (!url) { toast.error("Please paste a URL first"); return; }
    let fullUrl = url;
    if (!/^https?:\/\//i.test(fullUrl)) fullUrl = `https://${fullUrl}`;
    const { type, label: detectedLabel } = detectLinkType(fullUrl);
    const displayName = linkLabel.trim() || detectedLabel;
    setAddingLink(true);
    try {
      await addMutation.mutateAsync({
        section, sectionKey,
        fileUrl: fullUrl,
        fileKey: "",
        fileName: displayName,
        fileType: type,
        fileSizeBytes: undefined,
      });
      toast.success(`${displayName} linked`);
      setLinkUrl("");
      setLinkLabel("");
      setShowLinkInput(false);
    } catch {
      toast.error("Failed to save link");
    } finally {
      setAddingLink(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Remove "${name}"?`)) return;
    try { await deleteMutation.mutateAsync({ id }); toast.success("Removed"); }
    catch { toast.error("Failed to remove"); }
  };

  const visibleLinks = showAll ? links : links.slice(0, 3);
  const visibleFiles = showAll ? files : files.slice(0, 2);

  return (
    <div className="mb-5 rounded-xl border border-emerald-100 bg-emerald-50/60 overflow-hidden">
      {/* ── Top action bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-emerald-100">
        <span className="text-xs font-bold text-emerald-800 flex-1">
          Files & Links
          {totalCount > 0 && (
            <span className="ml-2 bg-emerald-200 text-emerald-800 rounded-full px-1.5 py-0.5 text-[10px] font-bold">
              {totalCount}
            </span>
          )}
        </span>

        {/* Attach files button */}
        <input ref={fileInputRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={handleFileChange} />
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="h-8 text-xs gap-1.5 border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 font-semibold"
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
          {uploading ? "Uploading…" : "Attach File"}
        </Button>

        {/* Add link button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowLinkInput(!showLinkInput)}
          className="h-8 text-xs gap-1.5 border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 font-semibold"
        >
          <Link2 className="w-3.5 h-3.5" />
          Add Link
        </Button>
      </div>

      {/* ── Link input panel ────────────────────────────────────────────────── */}
      {showLinkInput && (
        <div className="px-4 py-3 border-b border-emerald-100 bg-white">
          <p className="text-[10px] text-muted-foreground mb-2 font-medium">
            Paste a Google Sheet, Excel Online, or any URL
          </p>
          <div className="flex gap-2 mb-2">
            <Input
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/..."
              className="flex-1 h-8 text-xs"
              onKeyDown={e => e.key === "Enter" && handleAddLink()}
              autoFocus
            />
            <Button
              size="sm"
              onClick={handleAddLink}
              disabled={addingLink || !linkUrl.trim()}
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
            >
              {addingLink ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              Save
            </Button>
            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => { setShowLinkInput(false); setLinkUrl(""); setLinkLabel(""); }}>
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </div>
          <Input
            value={linkLabel}
            onChange={e => setLinkLabel(e.target.value)}
            placeholder="Label (optional) — e.g. 'Q1 Budget'"
            className="h-8 text-xs"
          />
        </div>
      )}

      {/* ── Linked items ────────────────────────────────────────────────────── */}
      {links.length > 0 && (
        <div className="px-4 pt-3 pb-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Linked Sheets & URLs</p>
          <div className="flex flex-wrap gap-2">
            {visibleLinks.map(link => (
              <div
                key={link.id}
                className="group flex items-center gap-1.5 bg-white border border-emerald-200 rounded-full px-3 py-1.5 text-xs font-medium text-emerald-800 hover:border-emerald-400 transition-colors max-w-[220px]"
              >
                <LinkTypeIcon type={link.fileType} />
                <span className="truncate flex-1">{link.fileName}</span>
                <a href={link.fileUrl} target="_blank" rel="noopener noreferrer" title="Open" className="shrink-0 hover:text-emerald-600">
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button onClick={() => handleDelete(link.id, link.fileName)} title="Remove" className="shrink-0 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Attached files ──────────────────────────────────────────────────── */}
      {files.length > 0 && (
        <div className="px-4 pt-2 pb-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Attached Files</p>
          <div className="flex flex-wrap gap-2">
            {visibleFiles.map(file => (
              <div
                key={file.id}
                className="group flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-gray-300 transition-colors max-w-[220px]"
              >
                <LinkTypeIcon type={file.fileType} />
                <span className="truncate flex-1">{file.fileName}</span>
                <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" title="Open" className="shrink-0 hover:text-gray-900">
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button onClick={() => handleDelete(file.id, file.fileName)} title="Remove" className="shrink-0 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Show more / less toggle */}
      {totalCount > 5 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full py-2 text-[10px] text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 border-t border-emerald-100 mt-1"
        >
          {showAll ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Show all {totalCount} items</>}
        </button>
      )}

      {/* Empty state */}
      {totalCount === 0 && !showLinkInput && (
        <div className="px-4 py-3 text-[11px] text-muted-foreground">
          No files or links yet — attach a PDF or link a Google Sheet above.
        </div>
      )}
    </div>
  );
}
