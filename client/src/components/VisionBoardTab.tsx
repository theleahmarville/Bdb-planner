import { useState, useRef, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Upload, X, ExternalLink, Loader2, Pin, Plus, ImageIcon, Camera,
} from "lucide-react";

interface VisionBoardTabProps {
  year: number;
  pinterestUrl?: string;
  onPinterestUrlChange?: (url: string) => void;
  pinterestCoverUrl?: string;
  onPinterestCoverUrlChange?: (url: string) => void;
}

/** Auto-fetch Pinterest board OG thumbnail via microlink.io */
function usePinterestThumbnail(url: string, manualCoverUrl: string) {
  const [thumb, setThumb] = useState<string | null>(manualCoverUrl || null);

  useEffect(() => {
    // Manual cover always wins
    if (manualCoverUrl) { setThumb(manualCoverUrl); return; }
    if (!url) { setThumb(null); return; }
    let cancelled = false;
    setThumb(null);
    fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}&meta=false`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (cancelled) return;
        const img = data?.data?.image?.url || data?.data?.screenshot?.url || null;
        if (img) setThumb(img);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [url, manualCoverUrl]);

  return thumb;
}

/** Extract a readable board name from a Pinterest URL */
function parsePinterestBoard(url: string): { user: string; board: string } | null {
  try {
    const clean = url.replace(/\/$/, "");
    const parts = clean.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => p.includes("pinterest.com"));
    if (idx === -1) return null;
    const user = parts[idx + 1] ?? "";
    const board = parts[idx + 2] ?? "";
    return user && board ? { user, board: board.replace(/-/g, " ") } : null;
  } catch {
    return null;
  }
}

export default function VisionBoardTab({
  year,
  pinterestUrl = "",
  onPinterestUrlChange,
  pinterestCoverUrl = "",
  onPinterestCoverUrlChange,
}: VisionBoardTabProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingCaption, setEditingCaption] = useState<number | null>(null);
  const [captionValue, setCaptionValue] = useState("");
  const [localPinterestUrl, setLocalPinterestUrl] = useState(pinterestUrl);
  const [localCoverUrl, setLocalCoverUrl] = useState(pinterestCoverUrl);
  const [editingPinterest, setEditingPinterest] = useState(false);
  const [editingCover, setEditingCover] = useState(false);
  const [coverInput, setCoverInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setLocalPinterestUrl(pinterestUrl); }, [pinterestUrl]);
  useEffect(() => { setLocalCoverUrl(pinterestCoverUrl); }, [pinterestCoverUrl]);

  // Auto-fetch thumbnail from microlink (falls back to manual cover)
  const thumbnail = usePinterestThumbnail(localPinterestUrl, localCoverUrl);

  const { data: images = [], refetch } = trpc.visionBoard.listImages.useQuery({ year });
  const addImageMutation = trpc.visionBoard.addImage.useMutation({ onSuccess: () => refetch() });
  const updateCaptionMutation = trpc.visionBoard.updateCaption.useMutation({ onSuccess: () => refetch() });
  const deleteImageMutation = trpc.visionBoard.deleteImage.useMutation({ onSuccess: () => refetch() });

  const uploadFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Only image files are supported"); return; }
    if (file.size > 20 * 1024 * 1024) { toast.error("Image must be under 20MB"); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload/image", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).error || "Upload failed");
      const { url, fileKey } = await res.json();
      await addImageMutation.mutateAsync({ year, imageUrl: url, fileKey, caption: "", position: images.length });
      toast.success("Image added to Vision Board ✨");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [year, images.length, addImageMutation]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    Array.from(e.dataTransfer.files).forEach(uploadFile);
  }, [uploadFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files ?? []).forEach(uploadFile);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const saveCaption = async (id: number) => {
    try {
      await updateCaptionMutation.mutateAsync({ id, caption: captionValue });
      setEditingCaption(null);
    } catch { toast.error("Failed to save caption"); }
  };

  const handleDeleteImage = async (id: number) => {
    if (!confirm("Remove this image from your Vision Board?")) return;
    try { await deleteImageMutation.mutateAsync({ id }); toast.success("Image removed"); }
    catch { toast.error("Failed to remove image"); }
  };

  const savePinterestUrl = () => {
    onPinterestUrlChange?.(localPinterestUrl);
    setEditingPinterest(false);
    toast.success("Pinterest board linked!");
  };

  const saveCoverUrl = () => {
    onPinterestCoverUrlChange?.(coverInput.trim());
    setLocalCoverUrl(coverInput.trim());
    setEditingCover(false);
    if (coverInput.trim()) toast.success("Cover photo set!");
  };

  const boardInfo = localPinterestUrl ? parsePinterestBoard(localPinterestUrl) : null;
  const hasContent = images.length > 0 || !!localPinterestUrl;

  return (
    <div className="space-y-5">

      {/* ── Controls bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {editingPinterest ? (
          <div className="flex gap-2 flex-1 min-w-0">
            <Input
              value={localPinterestUrl}
              onChange={(e) => setLocalPinterestUrl(e.target.value)}
              placeholder="https://pinterest.com/yourname/your-board/"
              className="text-sm h-9 flex-1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") savePinterestUrl();
                if (e.key === "Escape") setEditingPinterest(false);
              }}
            />
            <Button size="sm" onClick={savePinterestUrl} className="bg-red-500 hover:bg-red-600 text-white border-0">Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditingPinterest(false)}>Cancel</Button>
          </div>
        ) : localPinterestUrl ? (
          <button
            onClick={() => setEditingPinterest(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-100 transition-colors"
          >
            <Pin className="w-3 h-3" />
            {boardInfo?.board || "Pinterest Board"}
            <span className="text-red-400">· Change</span>
          </button>
        ) : (
          <button
            onClick={() => setEditingPinterest(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-dashed border-red-300 text-red-500 text-xs font-semibold hover:bg-red-50 transition-colors"
          >
            <Pin className="w-3 h-3" />
            Link Pinterest Board
          </button>
        )}

        <div className="flex-1" />

        <button
          onClick={() => !uploading && fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors disabled:opacity-60"
        >
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          Add Photos
        </button>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />

      {/* ── Empty state ────────────────────────────────────────────────────────── */}
      {!hasContent && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
            ${isDragging ? "border-emerald-400 bg-emerald-50 scale-[1.01]" : "border-[#e0d8cf] hover:border-emerald-300 hover:bg-[#faf8f5]"}`}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-green-50 flex items-center justify-center">
              <ImageIcon className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <p className="font-bold text-[#1a1a1a]">Build your vision collage</p>
              <p className="text-sm text-muted-foreground mt-1">Drop images here or click to upload · Link your Pinterest board above</p>
            </div>
            <p className="text-xs text-muted-foreground">JPG, PNG, GIF, WebP — up to 20MB each</p>
          </div>
        </div>
      )}

      {/* ── Vision collage ─────────────────────────────────────────────────────── */}
      {hasContent && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`transition-all rounded-2xl ${isDragging ? "ring-2 ring-emerald-400 ring-offset-2" : ""}`}
        >
          <div className="columns-2 sm:columns-3 gap-3 space-y-3">

            {/* ── Pinterest board card ──────────────────────────────────────── */}
            {localPinterestUrl && (
              <div className="break-inside-avoid mb-3">
                {/* Main card — clicking opens Pinterest */}
                <a
                  href={localPinterestUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-2xl overflow-hidden border border-red-100 bg-white shadow-sm group block no-underline hover:shadow-lg transition-all duration-300"
                >
                  {/* Cover image or gradient */}
                  <div className="relative w-full h-40 overflow-hidden">
                    {thumbnail ? (
                      <img
                        src={thumbnail}
                        alt="Pinterest board cover"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-red-400 via-rose-500 to-pink-500 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-12 h-12 rounded-full bg-white/20 mx-auto mb-2 flex items-center justify-center">
                            <span className="text-white text-2xl font-black">P</span>
                          </div>
                          <p className="text-white/80 text-xs font-medium">Tap to open board</p>
                        </div>
                      </div>
                    )}
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    {/* Pinterest badge */}
                    <div className="absolute top-2.5 left-2.5 w-7 h-7 rounded-full bg-red-600 flex items-center justify-center shadow">
                      <span className="text-white text-sm font-black leading-none">P</span>
                    </div>
                    {/* Board name overlay */}
                    <div className="absolute bottom-0 left-0 right-0 px-3 py-2.5">
                      <p className="text-[10px] text-white/70 capitalize truncate">{boardInfo?.user || "Pinterest"}</p>
                      <p className="text-sm font-bold text-white capitalize truncate leading-tight">{boardInfo?.board || "Vision Board"}</p>
                    </div>
                  </div>

                  {/* Open board CTA */}
                  <div className="px-3 py-2.5 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Tap to open on Pinterest</span>
                    <div className="flex items-center gap-1 text-red-500 text-xs font-bold group-hover:text-red-600">
                      Open <ExternalLink className="w-3 h-3" />
                    </div>
                  </div>
                </a>

                {/* Cover photo setter — sits below the card, not clickable through it */}
                {editingCover ? (
                  <div className="mt-2 flex gap-1.5">
                    <Input
                      value={coverInput}
                      onChange={(e) => setCoverInput(e.target.value)}
                      placeholder="Paste any image URL from Pinterest…"
                      className="text-xs h-8 flex-1"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveCoverUrl();
                        if (e.key === "Escape") setEditingCover(false);
                      }}
                    />
                    <Button size="sm" onClick={saveCoverUrl} className="h-8 bg-red-500 hover:bg-red-600 text-white border-0 text-xs px-3">Set</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingCover(false)} className="h-8 text-xs px-2">✕</Button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setCoverInput(localCoverUrl); setEditingCover(true); }}
                    className="mt-1.5 w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <Camera className="w-3 h-3" />
                    {localCoverUrl ? "Change cover photo" : "Add cover photo from Pinterest"}
                  </button>
                )}
              </div>
            )}

            {/* ── Uploaded images ───────────────────────────────────────────── */}
            {images.map((img) => (
              <div
                key={img.id}
                className="break-inside-avoid mb-3 group relative rounded-2xl overflow-hidden bg-muted shadow-sm"
              >
                <img
                  src={(img as any).imageUrl}
                  alt={(img as any).caption ?? "Vision board image"}
                  className="w-full h-auto block transition-transform duration-300 group-hover:scale-[1.02]"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-3">
                  <div className="flex justify-end">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteImage(img.id); }}
                      className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center hover:bg-red-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                  <div>
                    {editingCaption === img.id ? (
                      <input
                        autoFocus
                        value={captionValue}
                        onChange={(e) => setCaptionValue(e.target.value)}
                        onBlur={() => saveCaption(img.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveCaption(img.id);
                          if (e.key === "Escape") setEditingCaption(null);
                        }}
                        className="w-full bg-black/70 text-white text-xs rounded-lg px-2.5 py-1.5 outline-none border border-white/30 backdrop-blur-sm"
                        placeholder="Add a caption..."
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCaption(img.id);
                          setCaptionValue((img as any).caption ?? "");
                        }}
                        className="w-full text-left text-white text-xs bg-black/50 backdrop-blur-sm rounded-lg px-2.5 py-1.5 hover:bg-black/70 transition-colors"
                      >
                        {(img as any).caption || "✏️ Add caption"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* ── Add more tile ─────────────────────────────────────────────── */}
            <div
              onClick={() => !uploading && fileInputRef.current?.click()}
              className="break-inside-avoid mb-3 rounded-2xl border-2 border-dashed border-[#e0d8cf] hover:border-emerald-400 hover:bg-emerald-50/40 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 py-10 group"
            >
              {uploading ? (
                <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-emerald-100 group-hover:bg-emerald-200 flex items-center justify-center transition-colors">
                    <Upload className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground group-hover:text-emerald-700">Add photos</span>
                </>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
