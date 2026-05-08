import { useState, useEffect, useRef, useCallback } from "react";
import NoteAttachments from "@/components/NoteAttachments";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Trash2,
  Pin,
  PinOff,
  FolderOpen,
  StickyNote,
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  CheckSquare,
  ChevronLeft,
  X,
  Lock,
  LockOpen,
  Eye,
  EyeOff,
  BookOpen,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const DEFAULT_FOLDERS = ["All Notes", "Personal", "Work", "Goals", "Ideas", "Journal"];

function formatNoteDate(date: Date | string) {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return format(d, "h:mm a");
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return format(d, "EEEE");
  return format(d, "MM/dd/yyyy");
}

function getPreview(content: string): string {
  return content
    .replace(/#{1,6}\s/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/- \[x\]/g, "✓")
    .replace(/- \[ \]/g, "○")
    .replace(/^[-*]\s/gm, "")
    .replace(/\n+/g, " ")
    .trim()
    .slice(0, 100);
}

type Note = {
  id: number;
  title: string;
  content: string;
  folder: string;
  pinned: boolean;
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// ─── Lock Password Modal ───────────────────────────────────────────────────────
function LockModal({
  mode,
  onConfirm,
  onCancel,
  error,
}: {
  mode: "set" | "unlock" | "remove";
  onConfirm: (password: string, confirm?: string) => void;
  onCancel: () => void;
  error?: string;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const titles = {
    set: "Lock this note",
    unlock: "Unlock note",
    remove: "Remove lock",
  };
  const descriptions = {
    set: "Set a password to protect this note. You'll need it to view the content.",
    unlock: "Enter the password to view this note.",
    remove: "Enter your current password to remove the lock.",
  };
  const buttonLabels = {
    set: "Lock Note",
    unlock: "Unlock",
    remove: "Remove Lock",
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "set" && password !== confirm) {
      return;
    }
    onConfirm(password, confirm);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#faf7f2] rounded-2xl shadow-2xl w-full max-w-sm border border-[#d4cfc6] overflow-hidden">
        {/* Header */}
        <div className="bg-[#c8a96e] px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            {mode === "unlock" ? <LockOpen className="w-5 h-5 text-white" /> : <Lock className="w-5 h-5 text-white" />}
          </div>
          <div>
            <h3 className="text-white font-bold text-base">{titles[mode]}</h3>
            <p className="text-white/80 text-xs">{descriptions[mode]}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Password field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#5a5248] uppercase tracking-wider">
              {mode === "unlock" || mode === "remove" ? "Password" : "New Password"}
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="w-full px-3 py-2.5 pr-10 rounded-xl border border-[#d4cfc6] bg-white text-[#3d3730] text-sm outline-none focus:border-[#c8a96e] focus:ring-2 focus:ring-[#c8a96e]/20 transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9a9088] hover:text-[#5a5248]"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm password (only for set mode) */}
          {mode === "set" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#5a5248] uppercase tracking-wider">Confirm Password</label>
              <input
                type={showPw ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm password..."
                className="w-full px-3 py-2.5 rounded-xl border border-[#d4cfc6] bg-white text-[#3d3730] text-sm outline-none focus:border-[#c8a96e] focus:ring-2 focus:ring-[#c8a96e]/20 transition-all"
                required
              />
              {password && confirm && password !== confirm && (
                <p className="text-xs text-red-500">Passwords do not match</p>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl">
              <X className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          {/* Note for set mode */}
          {mode === "set" && (
            <div className="flex items-start gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-700">
                If you forget this password, your note content cannot be recovered. Store it somewhere safe.
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1 border-[#d4cfc6] text-[#5a5248] hover:bg-[#e8e3da]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mode === "set" && (password !== confirm || !password)}
              className="flex-1 bg-[#c8a96e] hover:bg-[#b8996e] text-white"
            >
              {buttonLabels[mode]}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Locked Note Overlay ──────────────────────────────────────────────────────
function LockedNoteOverlay({ onUnlock }: { onUnlock: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 text-[#9a9088] p-8">
      <div className="w-24 h-24 rounded-3xl bg-[#e8e3da] flex items-center justify-center">
        <Lock className="w-12 h-12 text-[#c8a96e]" />
      </div>
      <div className="text-center">
        <p className="text-xl font-bold text-[#3d3730]">This note is locked</p>
        <p className="text-sm text-[#9a9088] mt-1">Enter your password to view and edit this note</p>
      </div>
      <Button
        onClick={onUnlock}
        className="bg-[#c8a96e] hover:bg-[#b8996e] text-white gap-2 px-6"
      >
        <LockOpen className="w-4 h-4" />
        Unlock Note
      </Button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function NotesPage() {
  const { isAuthenticated } = useAuth();
  const [activeFolder, setActiveFolder] = useState("All Notes");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [localTitle, setLocalTitle] = useState("");
  const [localContent, setLocalContent] = useState("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Lock state
  const [lockModal, setLockModal] = useState<"set" | "unlock" | "remove" | null>(null);
  const [lockError, setLockError] = useState("");
  // Session-unlocked note IDs (stays unlocked until page refresh)
  const [sessionUnlocked, setSessionUnlocked] = useState<Set<number>>(new Set());

  const { data: notes = [], refetch } = trpc.notes.list.useQuery(
    { folder: activeFolder === "All Notes" ? undefined : activeFolder },
    { enabled: isAuthenticated }
  );

  const { data: searchResults } = trpc.notes.search.useQuery(
    { query: searchQuery },
    { enabled: isAuthenticated && searchQuery.length > 1 }
  );

  const { data: folders = [] } = trpc.notes.folders.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const createMutation = trpc.notes.create.useMutation({
    onSuccess: (note) => {
      refetch();
      if (note) {
        setSelectedNoteId(note.id);
        setLocalTitle(note.title);
        setLocalContent(note.content);
      }
    },
  });

  const updateMutation = trpc.notes.update.useMutation({
    onSuccess: () => refetch(),
  });

  const deleteMutation = trpc.notes.delete.useMutation({
    onSuccess: () => {
      refetch();
      setSelectedNoteId(null);
      setLocalTitle("");
      setLocalContent("");
      toast.success("Note deleted");
    },
  });

  const lockMutation = trpc.notes.lock.useMutation({
    onSuccess: () => {
      refetch();
      setLockModal(null);
      setLockError("");
      // Remove from session unlocked since it's now locked
      setSessionUnlocked((prev) => {
        const next = new Set(prev);
        if (selectedNoteId) next.delete(selectedNoteId);
        return next;
      });
      toast.success("Note locked");
    },
    onError: () => setLockError("Failed to lock note. Try again."),
  });

  const verifyLockMutation = trpc.notes.verifyLock.useMutation({
    onSuccess: (result) => {
      if (result.valid) {
        if (selectedNoteId) {
          setSessionUnlocked((prev) => new Set(Array.from(prev).concat(selectedNoteId)));
        }
        setLockModal(null);
        setLockError("");
      } else {
        setLockError("Incorrect password. Please try again.");
      }
    },
    onError: () => setLockError("Failed to verify password."),
  });

  const removeLockMutation = trpc.notes.removeLock.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        refetch();
        setLockModal(null);
        setLockError("");
        toast.success("Lock removed");
      } else {
        setLockError(result.error ?? "Incorrect password.");
      }
    },
    onError: () => setLockError("Failed to remove lock."),
  });

  const displayedNotes = searchQuery.length > 1 ? (searchResults ?? []) : notes;
  const selectedNote = displayedNotes.find((n) => n.id === selectedNoteId) ?? null;
  const isNoteUnlocked = selectedNoteId ? sessionUnlocked.has(selectedNoteId) : false;
  const canViewNote = selectedNote ? (!selectedNote.isLocked || isNoteUnlocked) : false;

  useEffect(() => {
    if (selectedNote && canViewNote) {
      setLocalTitle(selectedNote.title);
      setLocalContent(selectedNote.content);
    }
  }, [selectedNoteId, canViewNote]);

  const triggerSave = useCallback(
    (title: string, content: string) => {
      if (!selectedNoteId || !canViewNote) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        updateMutation.mutate({ id: selectedNoteId, title, content });
      }, 800);
    },
    [selectedNoteId, canViewNote, updateMutation]
  );

  const handleTitleChange = (val: string) => {
    setLocalTitle(val);
    triggerSave(val, localContent);
  };

  const handleContentChange = (val: string) => {
    setLocalContent(val);
    triggerSave(localTitle, val);
  };

  const handleNewNote = () => {
    const folder = activeFolder === "All Notes" ? "All Notes" : activeFolder;
    createMutation.mutate({ title: "Untitled", content: "", folder });
  };

  const handleDelete = () => {
    if (!selectedNoteId) return;
    deleteMutation.mutate({ id: selectedNoteId });
  };

  const handlePin = () => {
    if (!selectedNote) return;
    updateMutation.mutate({ id: selectedNote.id, pinned: !selectedNote.pinned });
    toast.success(selectedNote.pinned ? "Note unpinned" : "Note pinned");
  };

  const handleLockConfirm = (password: string) => {
    if (!selectedNoteId) return;
    setLockError("");
    if (lockModal === "set") {
      lockMutation.mutate({ id: selectedNoteId, password });
    } else if (lockModal === "unlock") {
      verifyLockMutation.mutate({ id: selectedNoteId, password });
    } else if (lockModal === "remove") {
      removeLockMutation.mutate({ id: selectedNoteId, password });
    }
  };

  const insertMarkdown = (prefix: string, suffix = "", placeholder = "text") => {
    const ta = editorRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = localContent.slice(start, end) || placeholder;
    const newContent = localContent.slice(0, start) + prefix + selected + suffix + localContent.slice(end);
    handleContentChange(newContent);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  };

  const insertLinePrefix = (prefix: string) => {
    const ta = editorRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const lineStart = localContent.lastIndexOf("\n", start - 1) + 1;
    const newContent = localContent.slice(0, lineStart) + prefix + localContent.slice(lineStart);
    handleContentChange(newContent);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, start + prefix.length);
    }, 0);
  };

  const allFolders = Array.from(new Set([...DEFAULT_FOLDERS, ...folders]));
  const pinnedNotes = displayedNotes.filter((n) => n.pinned);
  const unpinnedNotes = displayedNotes.filter((n) => !n.pinned);

  const [mobileView, setMobileView] = useState<"folders" | "list" | "editor">("list");

  const handleMobileNoteSelect = (id: number) => {
    setSelectedNoteId(id);
    setMobileView("editor");
  };

  return (
    <div className="flex h-full bg-[#f5f0e8] overflow-hidden" style={{ minHeight: "calc(100vh - 64px)" }}>

      {/* Lock Modal */}
      {lockModal && (
        <LockModal
          mode={lockModal}
          onConfirm={handleLockConfirm}
          onCancel={() => { setLockModal(null); setLockError(""); }}
          error={lockError}
        />
      )}

      {/* Folder Sidebar */}
      <div className={cn(
        "bg-[#ede8df] border-r border-[#d4cfc6] flex flex-col shrink-0 w-52",
        mobileView === "folders" ? "flex fixed inset-0 z-20 w-full md:relative md:w-52" : "hidden md:flex"
      )}>
        <div className="p-4 border-b border-[#d4cfc6] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#3d3730] uppercase tracking-wider">Folders</h2>
          <button onClick={() => setMobileView("list")} className="md:hidden p-1 rounded text-[#5a5248] hover:bg-[#ddd8cf]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
            {allFolders.map((folder) => {
              const count = folder === "All Notes" ? notes.length : notes.filter((n) => n.folder === folder).length;
              const isJournal = folder === "Journal";
              return (
                <button
                  key={folder}
                  onClick={() => { setActiveFolder(folder); setSelectedNoteId(null); setMobileView("list"); }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all text-left",
                    activeFolder === folder
                      ? "bg-[#c8a96e] text-white font-medium"
                      : "text-[#5a5248] hover:bg-[#ddd8cf]"
                  )}
                >
                  {isJournal ? (
                    <BookOpen className="w-4 h-4 shrink-0" />
                  ) : (
                    <FolderOpen className="w-4 h-4 shrink-0" />
                  )}
                  <span className="flex-1 truncate">{folder}</span>
                  {isJournal && (
                    <Lock className={cn("w-3 h-3 shrink-0", activeFolder === folder ? "text-white/70" : "text-[#c8a96e]")} />
                  )}
                  {count > 0 && (
                    <span className={cn("text-xs", activeFolder === folder ? "text-white/80" : "text-[#9a9088]")}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </ScrollArea>

        {/* Journal info banner */}
        {activeFolder === "Journal" && (
          <div className="p-3 border-t border-[#d4cfc6]">
            <div className="flex items-start gap-2 px-3 py-2 bg-[#c8a96e]/10 rounded-xl border border-[#c8a96e]/20">
              <ShieldCheck className="w-4 h-4 text-[#c8a96e] shrink-0 mt-0.5" />
              <p className="text-[10px] text-[#7a7068] leading-relaxed">
                Journal notes can be individually locked with a password for privacy.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Notes List */}
      <div className={cn(
        "bg-[#f0ebe2] border-r border-[#d4cfc6] flex flex-col shrink-0 w-72",
        mobileView === "list" ? "flex w-full md:w-72" : "hidden md:flex"
      )}>
        <div className="p-4 border-b border-[#d4cfc6] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => setMobileView("folders")} className="md:hidden p-1 rounded text-[#5a5248] hover:bg-[#ddd8cf] shrink-0">
              <FolderOpen className="w-4 h-4" />
            </button>
            <h2 className="font-semibold text-[#3d3730] truncate">{activeFolder}</h2>
          </div>
          <Button
            size="sm"
            onClick={() => { handleNewNote(); setMobileView("editor"); }}
            className="bg-[#c8a96e] hover:bg-[#b8996e] text-white h-8 w-8 p-0 rounded-full shrink-0"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <div className="px-3 py-2 border-b border-[#d4cfc6]">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9a9088]" />
            <Input
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm bg-[#e8e3da] border-[#d4cfc6] text-[#3d3730] placeholder:text-[#9a9088] focus-visible:ring-[#c8a96e]"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {displayedNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-[#9a9088] gap-2">
              <StickyNote className="w-8 h-8 opacity-40" />
              <p className="text-sm">No notes yet</p>
              <Button size="sm" variant="ghost" onClick={handleNewNote} className="text-[#c8a96e] hover:text-[#b8996e] hover:bg-[#e8e3da] text-xs">
                Create your first note
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-[#d4cfc6]">
              {pinnedNotes.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-xs font-semibold text-[#9a9088] uppercase tracking-wider bg-[#e8e3da]">Pinned</div>
                  {pinnedNotes.map((note) => (
                    <NoteListItem
                      key={note.id}
                      note={note as Note}
                      selected={selectedNoteId === note.id}
                      isUnlocked={sessionUnlocked.has(note.id)}
                      onClick={() => handleMobileNoteSelect(note.id)}
                    />
                  ))}
                  {unpinnedNotes.length > 0 && (
                    <div className="px-3 py-1.5 text-xs font-semibold text-[#9a9088] uppercase tracking-wider bg-[#e8e3da]">Notes</div>
                  )}
                </>
              )}
              {unpinnedNotes.map((note) => (
                <NoteListItem
                  key={note.id}
                  note={note as Note}
                  selected={selectedNoteId === note.id}
                  isUnlocked={sessionUnlocked.has(note.id)}
                  onClick={() => handleMobileNoteSelect(note.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Editor Panel */}
      <div className={cn(
        "flex-1 flex flex-col bg-[#faf7f2] overflow-hidden",
        mobileView === "editor" ? "flex w-full" : "hidden md:flex"
      )}>
        {selectedNote ? (
          <>
            {/* Toolbar */}
            <div className="flex items-center gap-1 px-4 py-2 border-b border-[#d4cfc6] bg-[#f0ebe2] flex-wrap">
              <button onClick={() => setMobileView("list")} className="md:hidden p-1 rounded text-[#5a5248] hover:bg-[#ddd8cf] mr-1 shrink-0">
                <ChevronLeft className="w-4 h-4" />
              </button>

              {canViewNote && (
                <>
                  <div className="flex items-center gap-0.5 border-r border-[#d4cfc6] pr-2 mr-1">
                    <ToolbarButton title="Bold" onClick={() => insertMarkdown("**", "**", "bold text")}>
                      <Bold className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton title="Italic" onClick={() => insertMarkdown("*", "*", "italic text")}>
                      <Italic className="w-4 h-4" />
                    </ToolbarButton>
                  </div>
                  <div className="flex items-center gap-0.5 border-r border-[#d4cfc6] pr-2 mr-1">
                    <ToolbarButton title="Heading 1" onClick={() => insertLinePrefix("# ")}>
                      <Heading1 className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton title="Heading 2" onClick={() => insertLinePrefix("## ")}>
                      <Heading2 className="w-4 h-4" />
                    </ToolbarButton>
                  </div>
                  <div className="flex items-center gap-0.5 border-r border-[#d4cfc6] pr-2 mr-1">
                    <ToolbarButton title="Bullet List" onClick={() => insertLinePrefix("- ")}>
                      <List className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton title="Numbered List" onClick={() => insertLinePrefix("1. ")}>
                      <ListOrdered className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton title="Checklist" onClick={() => insertLinePrefix("- [ ] ")}>
                      <CheckSquare className="w-4 h-4" />
                    </ToolbarButton>
                  </div>
                </>
              )}

              <div className="flex-1" />

              {updateMutation.isPending && canViewNote && (
                <span className="text-xs text-[#9a9088] italic">Saving...</span>
              )}
              {!updateMutation.isPending && selectedNote && canViewNote && (
                <span className="text-xs text-[#9a9088]">Saved {formatNoteDate(selectedNote.updatedAt)}</span>
              )}

              <div className="flex items-center gap-1 ml-2">
                {/* Lock button — only show for Journal notes */}
                {selectedNote.folder === "Journal" && (
                  <>
                    {selectedNote.isLocked ? (
                      <>
                        {isNoteUnlocked ? (
                          <ToolbarButton
                            title="Lock note again"
                            onClick={() => {
                              if (selectedNoteId) {
                                setSessionUnlocked((prev) => {
                                  const next = new Set(prev);
                                  next.delete(selectedNoteId);
                                  return next;
                                });
                                toast.success("Note locked");
                              }
                            }}
                            className="text-[#c8a96e] hover:text-[#b8996e]"
                          >
                            <Lock className="w-4 h-4" />
                          </ToolbarButton>
                        ) : (
                          <ToolbarButton
                            title="Unlock note"
                            onClick={() => { setLockError(""); setLockModal("unlock"); }}
                            className="text-[#c8a96e] hover:text-[#b8996e]"
                          >
                            <LockOpen className="w-4 h-4" />
                          </ToolbarButton>
                        )}
                        <ToolbarButton
                          title="Remove lock"
                          onClick={() => { setLockError(""); setLockModal("remove"); }}
                          className="text-[#9a9088] hover:text-[#5a5248]"
                        >
                          <ShieldCheck className="w-4 h-4" />
                        </ToolbarButton>
                      </>
                    ) : (
                      <ToolbarButton
                        title="Lock this note"
                        onClick={() => { setLockError(""); setLockModal("set"); }}
                        className="text-[#9a9088] hover:text-[#c8a96e]"
                      >
                        <Lock className="w-4 h-4" />
                      </ToolbarButton>
                    )}
                  </>
                )}

                {canViewNote && (
                  <ToolbarButton title={selectedNote.pinned ? "Unpin" : "Pin"} onClick={handlePin}>
                    {selectedNote.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                  </ToolbarButton>
                )}
                <ToolbarButton title="Delete note" onClick={handleDelete} className="text-red-400 hover:text-red-600 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </ToolbarButton>
              </div>
            </div>

            {/* Note content or locked overlay */}
            {canViewNote ? (
              <div className="flex-1 flex flex-col overflow-hidden p-6 gap-3">
                <input
                  type="text"
                  value={localTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Note title..."
                  className="w-full text-2xl font-bold text-[#2d2820] bg-transparent border-none outline-none placeholder:text-[#c8c0b4] font-serif"
                />
                <p className="text-xs text-[#9a9088]">
                  {format(new Date(selectedNote.updatedAt), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                  {selectedNote.folder !== "All Notes" && (
                    <span className="ml-2 px-2 py-0.5 bg-[#e8e3da] rounded-full text-[#7a7068]">{selectedNote.folder}</span>
                  )}
                  {selectedNote.isLocked && (
                    <span className="ml-2 px-2 py-0.5 bg-[#c8a96e]/20 rounded-full text-[#c8a96e] inline-flex items-center gap-1">
                      <LockOpen className="w-3 h-3" /> Unlocked
                    </span>
                  )}
                </p>
                <textarea
                  ref={editorRef}
                  value={localContent}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder={selectedNote.folder === "Journal"
                    ? "Dear Journal...\n\nWrite your thoughts here. This is your private space.\n\nUse markdown: **bold**, *italic*, - [ ] checklist"
                    : "Start writing your note here...\n\n# Heading 1\n**bold** or *italic*\n- bullet list\n- [ ] checklist item"
                  }
                  className="w-full resize-none bg-transparent border-none outline-none text-[#3d3730] text-base leading-relaxed placeholder:text-[#c8c0b4] font-mono text-sm"
                  style={{ minHeight: "300px" }}
                />
                <NoteAttachments noteId={selectedNote.id} isLocked={false} />
              </div>
            ) : (
              <LockedNoteOverlay onUnlock={() => { setLockError(""); setLockModal("unlock"); }} />
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[#9a9088] gap-4">
            <div className="w-20 h-20 rounded-2xl bg-[#e8e3da] flex items-center justify-center">
              <StickyNote className="w-10 h-10 text-[#c8a96e]" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-[#5a5248]">No note selected</p>
              <p className="text-sm mt-1">Select a note from the list or create a new one</p>
            </div>
            <Button onClick={handleNewNote} className="bg-[#c8a96e] hover:bg-[#b8996e] text-white gap-2">
              <Plus className="w-4 h-4" />
              New Note
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function NoteListItem({
  note,
  selected,
  isUnlocked,
  onClick,
}: {
  note: Note;
  selected: boolean;
  isUnlocked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 transition-all hover:bg-[#e8e3da]",
        selected && "bg-[#c8a96e]/20 border-l-2 border-[#c8a96e]"
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <p className={cn("text-sm font-medium truncate flex-1", selected ? "text-[#2d2820]" : "text-[#3d3730]")}>
          {note.isLocked && !isUnlocked ? (
            <span className="flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-[#c8a96e] shrink-0" />
              <span className="text-[#9a9088] italic">Locked note</span>
            </span>
          ) : (
            note.title || "Untitled"
          )}
        </p>
        <div className="flex items-center gap-1 shrink-0">
          {note.isLocked && isUnlocked && <LockOpen className="w-3 h-3 text-[#c8a96e]" />}
          {note.isLocked && !isUnlocked && null}
          {note.pinned && <Pin className="w-3 h-3 text-[#c8a96e]" />}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-0.5">
        <span className="text-xs text-[#9a9088]">{formatNoteDate(note.updatedAt)}</span>
        {note.isLocked && !isUnlocked ? (
          <p className="text-xs text-[#c8c0b4] italic truncate flex-1">Password protected</p>
        ) : note.content ? (
          <p className="text-xs text-[#9a9088] truncate flex-1">{getPreview(note.content)}</p>
        ) : null}
      </div>
    </button>
  );
}

function ToolbarButton({
  children,
  title,
  onClick,
  className,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={cn(
        "p-1.5 rounded text-[#5a5248] hover:bg-[#ddd8cf] hover:text-[#2d2820] transition-colors",
        className
      )}
    >
      {children}
    </button>
  );
}
