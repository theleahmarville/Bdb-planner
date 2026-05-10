/**
 * GlobalSearch — Cmd/Ctrl+K command palette.
 * Searches notes, files & PDFs, goals, reminders across the entire planner.
 * Results open inline; clicking navigates to the right page.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Search, X, FileText, Image as ImageIcon, BookOpen,
  Target, Bell, Link2, Sheet, StickyNote, Globe, Loader2,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Icon by result type / file type ──────────────────────────────────────────
function ResultIcon({ type, fileType }: { type: string; fileType?: string }) {
  if (type === "note") return <StickyNote className="w-4 h-4 text-blue-500 shrink-0" />;
  if (type === "goal") return <Target className="w-4 h-4 text-purple-500 shrink-0" />;
  if (type === "reminder") return <Bell className="w-4 h-4 text-red-500 shrink-0" />;
  if (type === "todo") return <Target className="w-4 h-4 text-emerald-500 shrink-0" />;
  // attachment sub-types
  if (fileType === "google_sheet") return <Sheet className="w-4 h-4 text-emerald-600 shrink-0" />;
  if (fileType === "excel_sheet") return <Sheet className="w-4 h-4 text-green-700 shrink-0" />;
  if (fileType === "link") return <Globe className="w-4 h-4 text-sky-500 shrink-0" />;
  if (fileType === "application/pdf" || fileType === "pdf")
    return <FileText className="w-4 h-4 text-red-500 shrink-0" />;
  if (fileType?.startsWith("image/"))
    return <ImageIcon className="w-4 h-4 text-blue-400 shrink-0" />;
  return <Link2 className="w-4 h-4 text-gray-400 shrink-0" />;
}

const TYPE_LABEL: Record<string, string> = {
  note: "Note",
  attachment: "File / Link",
  goal: "Big Goal",
  reminder: "Reminder",
  todo: "To-Do",
};

// ── Hook: detect Cmd+K / Ctrl+K ──────────────────────────────────────────────
function useSearchShortcut(onOpen: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpen();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onOpen]);
}

interface GlobalSearchProps {
  /** If true, renders as an always-visible input (e.g. sidebar top) */
  inline?: boolean;
}

export default function GlobalSearch({ inline = false }: GlobalSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();

  const debouncedQuery = useDebounce(query, 300);

  const { data: results = [], isFetching } = trpc.search.global.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.length >= 2, staleTime: 30_000 }
  );

  const handleOpen = useCallback(() => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIdx(0);
  }, []);

  useSearchShortcut(handleOpen);

  // Reset active index when results change
  useEffect(() => { setActiveIdx(0); }, [results]);

  const handleSelect = (item: (typeof results)[0]) => {
    // Attachments / links open directly in new tab
    if (item.type === "attachment" && item.fileUrl) {
      window.open(item.fileUrl, "_blank", "noopener");
    } else if (item.navPath) {
      navigate(item.navPath);
    }
    handleClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { handleClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && results[activeIdx]) { handleSelect(results[activeIdx]); }
  };

  // ── Inline search bar (shows in sidebar) ─────────────────────────────────
  if (inline) {
    return (
      <div className="relative px-2 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search…"
            className="w-full h-8 pl-8 pr-3 text-xs rounded-lg bg-sidebar-accent/60 border border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 focus:border-emerald-400/50 transition-colors"
          />
          {query && (
            <button onClick={() => { setQuery(""); setOpen(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Dropdown results */}
        {open && query.length >= 2 && (
          <div className="absolute left-2 right-2 top-full mt-1 bg-white border border-[#e8e0d5] rounded-xl shadow-xl z-50 overflow-hidden max-h-80 overflow-y-auto">
            <ResultsList
              results={results}
              loading={isFetching}
              query={debouncedQuery}
              activeIdx={activeIdx}
              onSelect={handleSelect}
              onHover={setActiveIdx}
            />
          </div>
        )}
      </div>
    );
  }

  // ── Full command-palette modal ────────────────────────────────────────────
  return (
    <>
      {/* Trigger button */}
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted rounded-lg px-3 h-8 border border-border/50 transition-colors w-full"
        title="Search (⌘K)"
      >
        <Search className="w-3.5 h-3.5 shrink-0" />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="text-[9px] bg-background border border-border rounded px-1 py-0.5 font-mono hidden sm:block">⌘K</kbd>
      </button>

      {/* Backdrop + palette */}
      {open && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 pointer-events-none">
            <div
              className="pointer-events-auto w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-[#e8e0d5]"
              onClick={e => e.stopPropagation()}
            >
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[#f0ebe4]">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search notes, files, goals, reminders…"
                  className="flex-1 text-sm bg-transparent border-0 outline-none text-[#1a1a1a] placeholder:text-[#c8c0b4]"
                  autoFocus
                />
                {isFetching && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500 shrink-0" />}
                {query && !isFetching && (
                  <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Results */}
              <div className="max-h-[50vh] overflow-y-auto">
                <ResultsList
                  results={results}
                  loading={isFetching && debouncedQuery.length >= 2}
                  query={debouncedQuery}
                  activeIdx={activeIdx}
                  onSelect={handleSelect}
                  onHover={setActiveIdx}
                />
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t border-[#f0ebe4] flex items-center gap-4 text-[10px] text-muted-foreground">
                <span><kbd className="font-mono bg-muted rounded px-1">↑↓</kbd> navigate</span>
                <span><kbd className="font-mono bg-muted rounded px-1">↵</kbd> open</span>
                <span><kbd className="font-mono bg-muted rounded px-1">Esc</kbd> close</span>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ── Shared results list ───────────────────────────────────────────────────────
function ResultsList({
  results,
  loading,
  query,
  activeIdx,
  onSelect,
  onHover,
}: {
  results: any[];
  loading: boolean;
  query: string;
  activeIdx: number;
  onSelect: (item: any) => void;
  onHover: (idx: number) => void;
}) {
  if (query.length < 2) {
    return (
      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
        Type at least 2 characters to search
      </div>
    );
  }
  if (loading) {
    return (
      <div className="px-4 py-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Searching…
      </div>
    );
  }
  if (results.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
        No results for <span className="font-semibold text-foreground">"{query}"</span>
      </div>
    );
  }

  // Group by type
  const groups: Record<string, typeof results> = {};
  results.forEach(r => {
    const g = r.type;
    if (!groups[g]) groups[g] = [];
    groups[g].push(r);
  });

  let globalIdx = 0;

  return (
    <div className="py-2">
      {Object.entries(groups).map(([type, items]) => (
        <div key={type}>
          <div className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
            {TYPE_LABEL[type] || type}s
          </div>
          {items.map((item) => {
            const idx = globalIdx++;
            const isActive = idx === activeIdx;
            return (
              <button
                key={item.id}
                onClick={() => onSelect(item)}
                onMouseEnter={() => onHover(idx)}
                className={cn(
                  "w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors",
                  isActive ? "bg-emerald-50" : "hover:bg-[#faf8f5]"
                )}
              >
                <div className="mt-0.5">
                  <ResultIcon type={item.type} fileType={item.fileType} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium truncate", isActive ? "text-emerald-800" : "text-[#1a1a1a]")}>
                    {highlightMatch(item.title, query)}
                  </p>
                  {item.excerpt && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{item.excerpt}</p>
                  )}
                  {item.meta && (
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">{item.meta}</p>
                  )}
                </div>
                {item.type === "attachment" && item.fileUrl && (
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-1" />
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// Highlight matching text
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query || !text) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-emerald-100 text-emerald-800 rounded-sm px-0.5 not-italic font-semibold">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}
