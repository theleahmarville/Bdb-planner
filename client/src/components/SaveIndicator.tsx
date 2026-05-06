import { Check, Loader2, AlertCircle } from "lucide-react";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  return (
    <span className="flex items-center gap-1 text-xs">
      {status === "saving" && (
        <>
          <Loader2 size={11} className="animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Saving...</span>
        </>
      )}
      {status === "saved" && (
        <>
          <Check size={11} className="text-green-600" />
          <span className="text-green-600">Saved</span>
        </>
      )}
      {status === "error" && (
        <>
          <AlertCircle size={11} className="text-red-500" />
          <span className="text-red-500">Save failed</span>
        </>
      )}
    </span>
  );
}
