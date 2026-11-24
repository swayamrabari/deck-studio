"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlignLeftIcon,
  ArrowLeftIcon,
  FilePlusIcon,
  FolderPlusIcon,
  ImagePlusIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PanelRightCloseIcon,
  PanelRightOpenIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  PresentationIcon,
  RotateCcwIcon,
  XIcon,
} from "lucide-react";
import { usePanelRef } from "react-resizable-panels";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { cn } from "cn";
import { slideFilePaths } from "@/lib/runtime-protocol";
import { CodeEditor, type CodeEditorHandle } from "./code-editor";
import { DeckPreview } from "./deck-preview";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileTree } from "./file-tree";
import { PathDialog } from "./path-dialog";
import {
  baseName,
  newSlideContent,
  nextSlideNumber,
  renamedFolderPath,
  rewriteKeys,
  slideSlug,
  type DeckMediaItem,
  type WorkspaceDialog,
} from "./workspace-utils";

export type { DeckMediaItem };

export function DeckWorkspace({
  deckId,
  title,
  initialFiles,
  initialMedia,
}: {
  deckId: string;
  title: string;
  initialFiles: Record<string, string>;
  initialMedia: DeckMediaItem[];
}) {
  const [files, setFiles] = useState<Record<string, string>>(initialFiles);
  const [deckTitle, setDeckTitle] = useState(title);
  const [savedFiles, setSavedFiles] = useState<Record<string, string>>(initialFiles);
  const [mediaList, setMediaList] = useState<DeckMediaItem[]>(initialMedia);
  const [openPaths, setOpenPaths] = useState<string[]>(() => {
    const first = initialFiles["deck/layout.tsx"]
      ? "deck/layout.tsx"
      : (Object.keys(initialFiles).sort()[0] ?? null);
    return first ? [first] : [];
  });
  const [activePath, setActivePath] = useState<string | null>(
    () =>
      (initialFiles["deck/layout.tsx"]
        ? "deck/layout.tsx"
        : (Object.keys(initialFiles).sort()[0] ?? null))
  );
  const [dialog, setDialog] = useState<WorkspaceDialog>(null);
  const [pending, setPending] = useState(false);
  const [savingCount, setSavingCount] = useState(0);
  const [draftValue, setDraftValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  // VS Code-style folders that own no files yet: they render in the tree
  // immediately and become permanent the moment a file is created inside.
  const [emptyFolders, setEmptyFolders] = useState<string[]>([]);

  const filesRef = useRef(files);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  const mediaInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<CodeEditorHandle>(null);
  const leftPanelRef = usePanelRef();
  const rightPanelRef = usePanelRef();
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  function togglePane(
    ref: typeof leftPanelRef,
    collapsed: boolean,
    setCollapsed: (value: boolean) => void
  ) {
    const panel = ref.current;
    if (!panel) return;
    if (panel.isCollapsed() || collapsed) {
      panel.expand();
      setCollapsed(false);
    } else {
      panel.collapse();
      setCollapsed(true);
    }
  }

  async function uploadMedia(uploads: FileList | File[]) {
    for (const file of Array.from(uploads)) {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/decks/${deckId}/media`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? "Upload failed.");
        return;
      }
      const data = (await res.json()) as DeckMediaItem;
      setMediaList((prev) => {
        const next = prev.filter((item) => item.name !== data.name);
        return [...next, data].sort((a, b) => a.name.localeCompare(b.name));
      });
      setError(null);
    }
  }

  async function deleteMedia(name: string) {
    const res = await fetch(
      `/api/decks/${deckId}/media/${encodeURIComponent(name)}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(data?.error ?? "Could not delete the media file.");
      return;
    }
    setMediaList((prev) => prev.filter((item) => item.name !== name));
    setDialog((current) =>
      current?.kind === "media" && current.name === name ? null : current
    );
    setError(null);
  }

  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
    };
  }, []);

  // One in-flight save chain per path: Ctrl+S can race the 800 ms debounce
  // timer, and unordered PUTs could let an older body land last on the
  // server while a newer one is marked saved. Chaining keeps each path's
  // requests ordered and each request snapshots the exact body it sent.
  const savesRef = useRef(new Map<string, Promise<void>>());

  async function persist(path: string) {
    if (filesRef.current[path] === undefined) return;

    setSavingCount((count) => count + 1);
    const prior = savesRef.current.get(path) ?? Promise.resolve();
    const run = prior.catch(() => {}).then(async () => {
      const content = filesRef.current[path];
      if (content === undefined) return;

      const res = await fetch(`/api/decks/${deckId}/files`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, content }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Save failed");
      }
      // Mark exactly the content that was sent. If the user kept typing,
      // files[path] is newer and the tab stays dirty until its own save.
      setSavedFiles((prev) => ({ ...prev, [path]: content }));
      setError(null);
    });

    savesRef.current.set(path, run);
    try {
      await run;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingCount((count) => count - 1);
      if (savesRef.current.get(path) === run) savesRef.current.delete(path);
    }
  }

  function queueSave(path: string) {
    const timers = timersRef.current;
    const existing = timers.get(path);
    if (existing) clearTimeout(existing);
    timers.set(
      path,
      setTimeout(() => {
        timers.delete(path);
        void persist(path);
      }, 800)
    );
  }

  function handleEditorChange(value: string) {
    if (!activePath) return;
    setFiles((prev) => ({ ...prev, [activePath]: value }));
    queueSave(activePath);
  }

  function openFile(path: string) {
    setOpenPaths((prev) => (prev.includes(path) ? prev : [...prev, path]));
    setActivePath(path);
  }

  async function closeTab(path: string) {
    // A timer armed before closing could re-save the just-closed file.
    const timer = timersRef.current.get(path);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(path);
    }
    if (files[path] !== savedFiles[path]) {
      await persist(path);
    }
    const remaining = openPaths.filter((p) => p !== path);
    setOpenPaths(remaining);
    if (activePath === path) {
      setActivePath(remaining[remaining.length - 1] ?? null);
    }
  }

  async function createFile(path: string, content: string) {
    setPending(true);
    try {
      const res = await fetch(`/api/decks/${deckId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, content }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Could not create the file.");
        return false;
      }
      setFiles((prev) => ({ ...prev, [path]: content }));
      setSavedFiles((prev) => ({ ...prev, [path]: content }));
      // The new file makes every pending folder on its path permanent.
      setEmptyFolders((prev) =>
        prev.filter((folder) => !path.startsWith(`${folder}/`))
      );
      openFile(path);
      setError(null);
      return true;
    } finally {
      setPending(false);
    }
  }

  async function createSlide(name: string) {
    const title = name.trim() || "Untitled slide";
    const number = nextSlideNumber(files);
    const slug = slideSlug(title);

    let path = `deck/${number}-${slug}/page.tsx`;
    let attempt = 2;
    while (files[path]) {
      path = `deck/${number}-${slug}-${attempt}/page.tsx`;
      attempt++;
    }
    if (await createFile(path, newSlideContent(title))) {
      setDialog(null);
    }
  }

  async function startFresh(name: string) {
    setPending(true);
    try {
      const folders = new Set<string>();
      for (const path of Object.keys(files)) {
        const match = /^deck\/(\d+-[^/]+)\/page\.tsx$/.exec(path);
        if (match) folders.add(`deck/${match[1]}`);
      }

      const isRemoved = (path: string) =>
        Array.from(folders).some(
          (folder) => path === folder || path.startsWith(`${folder}/`)
        );

      for (const folder of folders) {
        const res = await fetch(
          `/api/decks/${deckId}/files?path=${encodeURIComponent(folder)}&recursive=1`,
          { method: "DELETE" }
        );
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          setError(data?.error ?? "Could not clear the slides.");
          return;
        }
      }

      for (const [path, timer] of timersRef.current) {
        if (isRemoved(path)) {
          clearTimeout(timer);
          timersRef.current.delete(path);
        }
      }

      const remaining = Object.fromEntries(
        Object.entries(files).filter(([path]) => !isRemoved(path))
      );
      const title = name.trim() || "Untitled";
      const base = `deck/01-${slideSlug(title)}`;

      let path = `${base}/page.tsx`;
      let attempt = 2;
      while (remaining[path]) {
        path = `${base}-${attempt}/page.tsx`;
        attempt++;
      }

      const content = newSlideContent(title);
      const res = await fetch(`/api/decks/${deckId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, content }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? "Could not create the fresh slide.");
        return;
      }

      const next = { ...remaining, [path]: content };
      setFiles(next);
      setSavedFiles(next);
      setOpenPaths([path]);
      setActivePath(path);
      setDialog(null);
      setError(null);
    } finally {
      setPending(false);
    }
  }

  async function renameDeck(nextTitle: string) {
    const trimmed = nextTitle.trim();
    if (!trimmed) {
      setError("Project name is required.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch(`/api/decks/${deckId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      const data = (await res.json().catch(() => null)) as {
        title?: string;
        config?: string;
        error?: string;
      } | null;
      if (!res.ok) {
        setError(data?.error ?? "Rename failed.");
        return;
      }

      setDeckTitle(data?.title ?? trimmed);
      if (typeof data?.config === "string") {
        const configPath = "deck/deck.config.ts";
        setFiles((prev) => ({ ...prev, [configPath]: data.config as string }));
        setSavedFiles((prev) => ({
          ...prev,
          [configPath]: data.config as string,
        }));
      }
      setDialog(null);
      setError(null);
    } finally {
      setPending(false);
    }
  }

  async function renamePath(from: string, to: string) {
    if (from === to) {
      setDialog(null);
      return;
    }
    setPending(true);
    try {
      const res = await fetch(`/api/decks/${deckId}/files`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Rename failed.");
        return;
      }
      setFiles((prev) => rewriteKeys(prev, from, to));
      setSavedFiles((prev) => rewriteKeys(prev, from, to));
      setOpenPaths((prev) =>
        prev.map((path) =>
          path === from || path.startsWith(`${from}/`)
            ? to + path.slice(from.length)
            : path
        )
      );
      if (activePath && (activePath === from || activePath.startsWith(`${from}/`))) {
        setActivePath(to + activePath.slice(from.length));
      }
      setError(null);
      setDialog(null);
    } finally {
      setPending(false);
    }
  }

  async function deletePath(path: string, recursive: boolean) {
    // Pending folders own no rows — removing them is client-side only.
    if (emptyFolders.includes(path)) {
      setEmptyFolders((prev) =>
        prev.filter((folder) => folder !== path && !folder.startsWith(`${path}/`))
      );
      setDialog(null);
      setError(null);
      return;
    }

    setPending(true);
    try {
      const res = await fetch(
        `/api/decks/${deckId}/files?path=${encodeURIComponent(path)}&recursive=${recursive ? "1" : "0"}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Delete failed.");
        return;
      }
      // Cancel pending autosaves for the removed path(s): a stale timer
      // would PUT to a deleted file and flash a phantom error.
      const isRemoved = (candidate: string) =>
        recursive
          ? candidate === path || candidate.startsWith(`${path}/`)
          : candidate === path;
      for (const [timerPath, timer] of timersRef.current) {
        if (isRemoved(timerPath)) {
          clearTimeout(timer);
          timersRef.current.delete(timerPath);
        }
      }
      const withoutPath = (map: Record<string, string>) =>
        Object.fromEntries(
          Object.entries(map).filter(([key]) => !isRemoved(key))
        );
      setFiles((prev) => withoutPath(prev));
      setSavedFiles((prev) => withoutPath(prev));
      // Drop pending folders that lived inside the removed subtree too.
      setEmptyFolders((prev) => prev.filter((folder) => !isRemoved(folder)));
      const remaining = openPaths.filter((openPath) => !isRemoved(openPath));
      setOpenPaths(remaining);
      if (activePath && !remaining.includes(activePath)) {
        setActivePath(remaining[remaining.length - 1] ?? null);
      }
      setError(null);
      setDialog(null);
    } finally {
      setPending(false);
    }
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (activePath) void persist(activePath);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePath]);

  const dirtyCount = Object.keys(files).filter(
    (path) => files[path] !== savedFiles[path]
  ).length;
  const status = error
    ? "Save error"
    : savingCount > 0
      ? "Saving…"
      : dirtyCount > 0
        ? "Unsaved changes"
        : "Saved";

  const deleteSubtreeCount = dialog?.kind === "delete"
    ? Object.keys(files).filter(
        (path) =>
          path === dialog.path || path.startsWith(`${dialog.path}/`)
      ).length
    : 0;

  const nextSlide = nextSlideNumber(files);
  const newSlideFolder = draftValue.trim()
    ? `${nextSlide}-${slideSlug(draftValue)}`
    : `${nextSlide}-…`;

  const deckSlideCount = new Set(
    Object.keys(files)
      .map((path) => /^deck\/(\d+-[^/]+)\/page\.tsx$/.exec(path)?.[1])
      .filter((folder): folder is string => Boolean(folder))
  ).size;
  const freshSlideFolder = draftValue.trim()
    ? `01-${slideSlug(draftValue)}`
    : "01-…";

  // Presentation position per slide path ("01", "02", …) — labels the
  // page.tsx tabs and tree rows so identical names stay distinguishable.
  const slideNumbers = new Map(
    slideFilePaths(files).map((path, index) => [
      path,
      String(index + 1).padStart(2, "0"),
    ])
  );

  const renameParent =
    dialog?.kind === "rename"
      ? dialog.path.split("/").slice(0, -1).join("/")
      : "";
  const renameFolderPreview = dialog?.kind === "rename" && dialog.folder
    ? draftValue.trim()
      ? renamedFolderPath(dialog.path, draftValue)
      : `${renameParent}/…`
    : null;

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="flex h-15 shrink-0 items-center justify-between gap-4 border-b border-border px-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/decks"
            prefetch={false}
            aria-label="Back to decks"
            className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
          >
            <ArrowLeftIcon />
          </Link>
          <div className="min-w-0">
            <p className="font-ui-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Workspace
            </p>
            <div className="flex items-center gap-1.5">
              <h1 className="truncate text-sm leading-tight font-medium">
                {deckTitle}
              </h1>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Rename project"
                title="Rename project"
                onClick={() => {
                  setDraftValue(deckTitle);
                  setDialog({ kind: "rename-deck" });
                }}
              >
                <PencilIcon className="size-3" />
              </Button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {error ? (
            <span className="max-w-64 truncate text-xs text-destructive">{error}</span>
          ) : null}
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={leftCollapsed ? "Show file tree" : "Hide file tree"}
              title={leftCollapsed ? "Show file tree" : "Hide file tree"}
              onClick={() =>
                togglePane(leftPanelRef, leftCollapsed, setLeftCollapsed)
              }
            >
              {leftCollapsed ? <PanelLeftOpenIcon /> : <PanelLeftCloseIcon />}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={rightCollapsed ? "Show preview" : "Hide preview"}
              title={rightCollapsed ? "Show preview" : "Hide preview"}
              onClick={() =>
                togglePane(rightPanelRef, rightCollapsed, setRightCollapsed)
              }
            >
              {rightCollapsed ? <PanelRightOpenIcon /> : <PanelRightCloseIcon />}
            </Button>
          </div>
          <span className="flex items-center gap-1.5 font-ui-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <span
              className={cn(
                "size-1.5 rounded-full",
                error
                  ? "bg-destructive"
                  : dirtyCount > 0 || savingCount > 0
                    ? "bg-foreground"
                    : "bg-muted-foreground/40"
              )}
            />
            {status}
          </span>
          <Link
            href={`/decks/${deckId}/present`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <PlayIcon />
            Present
          </Link>
        </div>
      </header>

      <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
        <ResizablePanel
          defaultSize={240}
          minSize={180}
          maxSize={360}
          groupResizeBehavior="preserve-pixel-size"
          collapsible
          collapsedSize={0}
          panelRef={leftPanelRef}
          onResize={() =>
            setLeftCollapsed(leftPanelRef.current?.isCollapsed() ?? false)
          }
        >
          <aside className="flex h-full min-h-0 flex-col">
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3">
            <span className="font-ui-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              deck/
            </span>
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="New file"
                title="New file"
                onClick={() => {
                  setDraftValue("");
                  setDialog({ kind: "new-file", base: "deck" });
                }}
              >
                <FilePlusIcon />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="New folder"
                title="New folder"
                onClick={() => {
                  setDraftValue("");
                  setDialog({ kind: "new-folder" });
                }}
              >
                <FolderPlusIcon />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon-xs" aria-label="More actions" />
                  }
                >
                  <PlusIcon />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-60">
                  <DropdownMenuItem
                    onClick={() => {
                      setDraftValue("");
                      setDialog({ kind: "new-slide" });
                    }}
                  >
                    <PresentationIcon />
                    New slide
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => mediaInputRef.current?.click()}
                  >
                    <ImagePlusIcon />
                    Upload media…
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => {
                      setDraftValue("Untitled");
                      setDialog({ kind: "start-fresh" });
                    }}
                  >
                    <RotateCcwIcon />
                    Start fresh…
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div className="py-2">
              <FileTree
                paths={Object.keys(files)}
                emptyFolders={emptyFolders}
                activePath={activePath}
                onOpen={openFile}
                onAddFile={(folderPath) => {
                  setDraftValue("");
                  setDialog({ kind: "new-file", base: folderPath });
                }}
                onRename={(path, folder) => {
                  setDraftValue(
                    folder
                      ? baseName(path).replace(/^\d+-/, "")
                      : baseName(path)
                  );
                  setDialog({ kind: "rename", path, folder });
                }}
                onDelete={(path, folder) => setDialog({ kind: "delete", path, folder })}
                media={mediaList}
                onOpenMedia={(name) => setDialog({ kind: "media", name })}
                onDeleteMedia={(name) => void deleteMedia(name)}
              />
            </div>
          </ScrollArea>
          <div className="shrink-0 border-t border-border px-3 py-2 font-ui-mono text-[10px] text-muted-foreground">
            {Object.keys(files).length} files
          </div>
          </aside>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize="52%" minSize={320} className="min-w-0">
          <section className="flex h-full min-h-0 min-w-0 flex-col">
          {openPaths.length > 0 ? (
            <>
              <div className="flex h-10 shrink-0 items-stretch border-b border-border">
                <ScrollArea orientation="horizontal" className="h-full min-w-0 flex-1">
                  <div className="flex h-full w-max min-w-full items-stretch">
                    {openPaths.map((path) => {
                  const isActive = path === activePath;
                  const isDirty = files[path] !== savedFiles[path];
                  return (
                    <div
                      key={path}
                      role="button"
                      tabIndex={0}
                      onClick={() => setActivePath(path)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          setActivePath(path);
                        }
                      }}
                      className={cn(
                        "group flex shrink-0 cursor-pointer items-center gap-2 border-r border-border px-3 font-ui-mono text-xs transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring/50 focus-visible:ring-inset",
                        isActive
                          ? "bg-card text-foreground"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      )}
                    >
                      <span className="max-w-44 truncate">
                        {baseName(path)}
                        {slideNumbers.get(path) ? (
                          <span className="ml-1.5 text-muted-foreground/70">
                            {slideNumbers.get(path)}
                          </span>
                        ) : null}
                      </span>
                      {isDirty ? (
                        <span className="size-1.5 rounded-full bg-foreground" />
                      ) : null}
                      <button
                        type="button"
                        aria-label={`Close ${baseName(path)}`}
                        className="cursor-pointer rounded-sm p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-foreground"
                        onClick={(event) => {
                          event.stopPropagation();
                          void closeTab(path);
                        }}
                      >
                        <XIcon className="size-3" />
                      </button>
                    </div>
                  );
                    })}
                  </div>
                </ScrollArea>
                <div className="flex shrink-0 items-center border-l border-border px-1.5">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Format file (Shift+Alt+F)"
                    onClick={() => editorRef.current?.format()}
                    disabled={!activePath}
                  >
                    <AlignLeftIcon />
                  </Button>
                </div>
              </div>
              <div className="min-h-0 flex-1">
                {activePath && files[activePath] !== undefined ? (
                  <CodeEditor
                    key={activePath}
                    ref={editorRef}
                    path={activePath}
                    value={files[activePath]}
                    onChange={handleEditorChange}
                  />
                ) : null}
              </div>
              <div className="flex h-7 shrink-0 items-center justify-between border-t border-border px-3 font-ui-mono text-[10px] text-muted-foreground">
                <span className="truncate">{activePath}</span>
                <span>
                  {dirtyCount > 0 ? `${dirtyCount} unsaved` : "All saved"}
                </span>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-muted-foreground">
                Select a file to start editing.
              </p>
            </div>
          )}
          </section>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel
          defaultSize={360}
          minSize={240}
          maxSize={640}
          groupResizeBehavior="preserve-pixel-size"
          collapsible
          collapsedSize={0}
          panelRef={rightPanelRef}
          onResize={() =>
            setRightCollapsed(rightPanelRef.current?.isCollapsed() ?? false)
          }
        >
          <aside className="flex h-full min-h-0 flex-col">
            <div className="flex h-10 shrink-0 items-center border-b border-border px-3">
              <span className="font-ui-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Preview
              </span>
            </div>
            <DeckPreview deckId={deckId} files={files} activePath={activePath} />
          </aside>
        </ResizablePanel>
      </ResizablePanelGroup>

      <input
        ref={mediaInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files?.length) {
            void uploadMedia(event.target.files);
          }
          event.target.value = "";
        }}
      />

      <Dialog
        open={dialog?.kind === "rename-deck"}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename project</DialogTitle>
            <DialogDescription>
              Updates the project name and the title in deck.config.ts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="project-name">Project name</Label>
            <Input
              id="project-name"
              value={draftValue}
              autoFocus
              className="text-sm"
              onChange={(event) => setDraftValue(event.target.value)}
              onFocus={(event) => event.target.select()}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !pending) {
                  event.preventDefault();
                  void renameDeck(draftValue);
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialog(null)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void renameDeck(draftValue)}
              disabled={pending}
            >
              {pending ? "Renaming…" : "Rename project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog?.kind === "start-fresh"}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start fresh</DialogTitle>
            <DialogDescription>
              This removes {deckSlideCount} slide
              {deckSlideCount === 1 ? "" : "s"} and replaces them with one
              fresh slide. Layout, styles, media, and components stay.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="fresh-slide-name">First slide name</Label>
            <Input
              id="fresh-slide-name"
              value={draftValue}
              autoFocus
              placeholder="Untitled"
              className="text-sm"
              onChange={(event) => setDraftValue(event.target.value)}
              onFocus={(event) => event.target.select()}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !pending) {
                  event.preventDefault();
                  void startFresh(draftValue);
                }
              }}
            />
            <p className="truncate font-ui-mono text-[10px] text-muted-foreground">
              deck/{freshSlideFolder}/page.tsx
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialog(null)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void startFresh(draftValue)}
              disabled={pending}
            >
              {pending ? "Starting…" : "Start fresh"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog?.kind === "new-slide"}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New slide</DialogTitle>
            <DialogDescription>
              Name the slide. The folder number is assigned automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="slide-name">Slide name</Label>
            <Input
              id="slide-name"
              value={draftValue}
              autoFocus
              placeholder="Product roadmap"
              className="text-sm"
              onChange={(event) => setDraftValue(event.target.value)}
              onFocus={(event) => event.target.select()}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !pending) {
                  event.preventDefault();
                  void createSlide(draftValue);
                }
              }}
            />
            <p className="truncate font-ui-mono text-[10px] text-muted-foreground">
              deck/{newSlideFolder}/page.tsx
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialog(null)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void createSlide(draftValue)}
              disabled={pending}
            >
              {pending ? "Creating…" : "Create slide"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PathDialog
        open={dialog?.kind === "new-file"}
        title="New file"
        description="Type the path relative to the folder — new folders along the way are created automatically."
        basePath={dialog?.kind === "new-file" ? `${dialog.base}/` : undefined}
        placeholder={
          dialog?.kind === "new-file" && dialog.base === "deck"
            ? "components/card.tsx"
            : "card.tsx"
        }
        draft={draftValue}
        onDraftChange={setDraftValue}
        confirmLabel="Create file"
        pending={pending}
        onCancel={() => setDialog(null)}
        onConfirm={async () => {
          if (dialog?.kind !== "new-file") return;
          const name = draftValue.trim();
          const path = `${dialog.base}/${name}`;
          if (!name) {
            setError("Enter a file name.");
            return;
          }
          if (name.endsWith("/")) {
            setError(
              "End with the file name — folders along the way are created automatically."
            );
            return;
          }
          if (Object.keys(files).includes(path)) {
            setError("A file with this name already exists here.");
            return;
          }
          // A "folder" path would create a file row that shadows the real
          // folder — guide to the file-inside form instead.
          const folderExists = Object.keys(files).some(
            (existing) => existing.startsWith(`${path}/`)
          );
          if (folderExists) {
            setError(
              "That name is already a folder here — add the file inside it instead."
            );
            return;
          }
          // The inverse collision: an existing file sits where a folder
          // would need to be (e.g. file "deck/components" vs new
          // "deck/components/card.tsx") — it would duplicate rows in the
          // tree. Ask the user to clear the name first.
          const blockedByFile = Object.keys(files).some(
            (existing) => path.startsWith(`${existing}/`)
          );
          if (blockedByFile) {
            setError(
              "A file already occupies a parent segment of that path — rename or delete it first."
            );
            return;
          }
          if (await createFile(path, "")) setDialog(null);
        }}
      />

      <PathDialog
        open={dialog?.kind === "new-folder"}
        title="New folder"
        description="The folder appears in the tree right away — add files with the folder's + button; the first file inside makes it a permanent part of the deck."
        basePath="deck/"
        placeholder="components"
        draft={draftValue}
        onDraftChange={setDraftValue}
        confirmLabel="Create folder"
        pending={false}
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          const name = draftValue.trim().replace(/\/+$/, "");
          const path = name ? `deck/${name}` : "";
          if (!name) {
            setError("Enter a folder name.");
            return;
          }
          if (files[path] !== undefined) {
            setError("A file with this name already exists.");
            return;
          }
          if (
            emptyFolders.includes(path) ||
            Object.keys(files).some((existing) =>
              existing.startsWith(`${path}/`)
            )
          ) {
            setError("A folder with this name already exists.");
            return;
          }
          // A file sitting on a parent segment would collide with the new
          // folder in the tree — clear the name first.
          if (
            Object.keys(files).some((existing) => path.startsWith(`${existing}/`))
          ) {
            setError(
              "A file already occupies a parent segment of that path — rename or delete it first."
            );
            return;
          }
          setEmptyFolders((prev) => [...prev, path]);
          setError(null);
          setDialog(null);
        }}
      />

      <PathDialog
        open={dialog?.kind === "rename"}
        title={
          dialog?.kind === "rename" && dialog.folder
            ? "Rename slide"
            : "Rename file"
        }
        description={
          dialog?.kind === "rename" && dialog.folder
            ? "Renames the slide folder and every file inside it. The number stays."
            : "Renames the file inside its folder."
        }
        label={
          dialog?.kind === "rename" && dialog.folder
            ? "Slide name"
            : "File name"
        }
        basePath={
          dialog?.kind === "rename" && !dialog.folder
            ? `${renameParent}/`
            : undefined
        }
        preview={
          renameFolderPreview ? (
            <p className="truncate font-ui-mono text-[10px] text-muted-foreground">
              {renameFolderPreview}
            </p>
          ) : null
        }
        draft={draftValue}
        onDraftChange={setDraftValue}
        confirmLabel="Rename"
        pending={pending}
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          if (dialog?.kind !== "rename") return;
          const name = draftValue.trim();
          if (!name) {
            setError(
              dialog.folder ? "Slide name is required." : "File name is required."
            );
            return;
          }
          const to = dialog.folder
            ? renamedFolderPath(dialog.path, name)
            : `${renameParent}/${name}`;
          if (to === dialog.path) {
            setDialog(null);
            return;
          }
          if (!dialog.folder) {
            // File renames stay inside their folder — just the name.
            if (name.includes("/")) {
              setError(
                "Rename stays inside the folder — enter just the file name."
              );
              return;
            }
            if (!/^[A-Za-z0-9._-]+$/.test(name)) {
              setError(
                "File names use letters, numbers, dots, dashes, and underscores."
              );
              return;
            }
          }
          if (files[to] !== undefined) {
            setError("A file with this name already exists.");
            return;
          }
          void renamePath(dialog.path, to);
        }}
      />

      <Dialog
        open={dialog?.kind === "delete"}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog?.kind === "delete" && dialog.folder
                ? "Delete folder?"
                : "Delete file?"}
            </DialogTitle>
            <DialogDescription>
              {dialog?.kind === "delete" && dialog.folder
                ? deleteSubtreeCount === 0 && emptyFolders.includes(dialog.path)
                  ? "This folder is empty and not saved yet — removing it changes nothing on the server."
                  : `This removes ${deleteSubtreeCount} file${deleteSubtreeCount === 1 ? "" : "s"} under ${dialog.path}. This cannot be undone.`
                : "This permanently removes the file from the deck."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={pending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => {
                if (dialog?.kind === "delete") {
                  void deletePath(dialog.path, dialog.folder);
                }
              }}
            >
              {pending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog?.kind === "media"}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-ui-mono text-sm">
              {dialog?.kind === "media" ? dialog.name : ""}
            </DialogTitle>
            <DialogDescription>
              Use it in any slide with{" "}
              <span className="font-ui-mono text-xs">
                media(&quot;{dialog?.kind === "media" ? dialog.name : ""}&quot;)
              </span>
            </DialogDescription>
          </DialogHeader>
          {dialog?.kind === "media" ? (
            <div className="overflow-hidden rounded-md border border-border bg-deck-bg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/decks/${deckId}/media/${encodeURIComponent(dialog.name)}`}
                alt={dialog.name}
                className="max-h-96 w-full object-contain"
              />
            </div>
          ) : null}
          <DialogFooter>
            {dialog?.kind === "media" ? (
              <Button
                variant="destructive"
                onClick={() => void deleteMedia(dialog.name)}
              >
                Delete
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => setDialog(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
