import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Upload,
  X,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Pin,
  Link2,
} from "lucide-react";

interface VisionBoardTabProps {
  year: number;
  pinterestUrl?: string;
  onPinterestUrlChange?: (url: string) => void;
}

export default function VisionBoardTab({
  year,
  pinterestUrl = "",
  onPinterestUrlChange,
}: VisionBoardTabProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingCaption, setEditingCaption] = useState<number | null>(null);
  const [captionValue, setCaptionValue] = useState("");
  const [localPinterestUrl, setLocalPinterestUrl] = useState(pinterestUrl);
  const [editingPinterest, setEditingPinterest] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: images = [], refetch } = trpc.visionBoard.listImages.useQuery({ year });

  const addImageMutation = trpc.visionBoard.addImage.useMutation({
    onSuccess: () => refetch(),
  });

  const updateCaptionMutation = trpc.visionBoard.updateCaption.useMutation({
    onSuccess: () => refetch(),
  });

  const deleteImageMutation = trpc.visionBoard.deleteImage.useMutation({
    onSuccess: () => refetch(),
  });

  const uploadFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Only image files are supported for the Vision Board");
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast.error("Image must be under 20MB");
        return;
      }

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload/image", {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Upload failed");
        }

        const { url, fileKey } = await res.json();
        await addImageMutation.mutateAsync({
          year,
          imageUrl: url,
          fileKey,
          caption: "",
          position: images.length,
        });
        toast.success("Image added to Vision Board");
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Upload failed";
        toast.error(message);
      } finally {
        setUploading(false);
      }
    },
    [year, images.length, addImageMutation]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      files.forEach(uploadFile);
    },
    [uploadFile]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach(uploadFile);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startEditCaption = (id: number, currentCaption: string) => {
    setEditingCaption(id);
    setCaptionValue(currentCaption ?? "");
  };

  const saveCaption = async (id: number) => {
    try {
      await updateCaptionMutation.mutateAsync({ id, caption: captionValue });
      setEditingCaption(null);
    } catch {
      toast.error("Failed to save caption. Please try again.");
    }
  };

  const handleDeleteImage = async (id: number) => {
    if (!confirm("Remove this image from your Vision Board?")) return;
    try {
      await deleteImageMutation.mutateAsync({ id });
      toast.success("Image removed");
    } catch {
      toast.error("Failed to remove image. Please try again.");
    }
  };

  const savePinterestUrl = () => {
    onPinterestUrlChange?.(localPinterestUrl);
    setEditingPinterest(false);
    toast.success("Pinterest board linked");
  };

  return (
    <div className="space-y-6">
      {/* Pinterest Integration */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center">
            <Pin className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Pinterest Board</h3>
            <p className="text-xs text-muted-foreground">Link your Pinterest board for inspiration</p>
          </div>
        </div>

        {editingPinterest ? (
          <div className="flex gap-2">
            <Input
              value={localPinterestUrl}
              onChange={(e) => setLocalPinterestUrl(e.target.value)}
              placeholder="https://pinterest.com/yourname/your-board"
              className="text-sm h-9"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") savePinterestUrl();
                if (e.key === "Escape") setEditingPinterest(false);
              }}
            />
            <Button size="sm" onClick={savePinterestUrl}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditingPinterest(false)}>Cancel</Button>
          </div>
        ) : localPinterestUrl ? (
          <div className="flex items-center gap-2">
            <a
              href={localPinterestUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 font-medium"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Pinterest Board
            </a>
            <span className="text-muted-foreground">·</span>
            <button
              onClick={() => setEditingPinterest(true)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Change
            </button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditingPinterest(true)}
            className="gap-2"
          >
            <Link2 className="w-3.5 h-3.5" />
            Link Pinterest Board
          </Button>
        )}
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
          ${isDragging
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border hover:border-primary/50 hover:bg-muted/30"
          }
          ${uploading ? "pointer-events-none opacity-70" : ""}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Upload className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="font-medium text-sm">Drop images here or click to upload</p>
            <p className="text-xs text-muted-foreground">JPG, PNG, GIF, WebP — up to 20MB each</p>
          </div>
        )}
      </div>

      {/* Image Grid */}
      {images.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Your Vision Board is empty</p>
          <p className="text-xs mt-1">Upload images that inspire your 2026 vision</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((img) => (
            <div
              key={img.id}
              className="group relative rounded-xl overflow-hidden bg-muted aspect-square"
            >
              <img
                src={img.imageUrl}
                alt={img.caption ?? "Vision board image"}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />

              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                {/* Delete button */}
                <div className="flex justify-end">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteImage(img.id); }}
                    className="min-w-[44px] min-h-[44px] rounded-full bg-black/60 flex items-center justify-center hover:bg-red-500 transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>

                {/* Caption */}
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
                      className="w-full bg-black/60 text-white text-xs rounded px-2 py-1 outline-none border border-white/30"
                      placeholder="Add a caption..."
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); startEditCaption(img.id, img.caption ?? ""); }}
                      className="w-full text-left text-white text-xs bg-black/40 rounded px-2 py-1 hover:bg-black/60 transition-colors"
                    >
                      {img.caption || "Add caption..."}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
