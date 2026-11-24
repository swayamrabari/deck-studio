"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlignLeftIcon,
  ArrowLeftIcon,
  FilePlusIcon,
  ImagePlusIcon,
  PlayIcon,
  PlusIcon,
  PresentationIcon,
  XIcon,
} from "lucide-react";

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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "cn";
import { CodeEditor, type CodeEditorHandle } from "./code-editor";
import { DeckPreview } from "./deck-preview";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileTree } from "./file-tree";

const NEW_SLIDE_CONTENT = `import { Statement } from "@/components/slides";
import type { SlideMeta } from "@/lib/types";

export const meta: SlideMeta = {
  title: "New slide",
  notes: "",
};

export default function NewSlide() {
  return <Statement>New slide — make it yours.</Statement>;
}
`;

type WorkspaceDialog =
  | { kind: "new-file" }
  | { kind: "rename"; path: string }
  | { kind: "delete"; path: string; folder: boolean }
  | { kind: "media"; name: string }
  | null;

function baseName(path: string) {
  return path.split("/").pop() ?? path;
}

export interface DeckMediaItem {
  name: string;
  size: number;
  mime: string;
}

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

  const filesRef = useRef(files);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  const mediaInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<CodeEditorHandle>(null);

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
    if (res.ok) {
      setMediaList((prev) => prev.filter((item) => item.name !== name));
      setDialog((current) =>
        current?.kind === "media" && current.name === name ? null : current
      );
    }
  }

  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
    };
  }, []);

  async function persist(path: string) {
    const content = filesRef.current[path];
    if (content === undefined) return;

    setSavingCount((count) => count + 1);
    try {
      const res = await fetch(`/api/decks/${deckId}/files`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, content }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Save failed");
      }
      const savedContent = filesRef.current[path];
      if (savedContent !== undefined) {
        setSavedFiles((prev) => ({ ...prev, [path]: savedContent }));
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingCount((count) => count - 1);
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
    if (files[path] !== savedFiles[path]) {
      await persist(path);
    }
    const remaining = openPaths.filter((p) => p !== path);
    setOpenPaths(remaining);
    if (activePath === path) {
      setActivePath(remaining[remaining.length - 1] ?? null);
    }
  }

  function rewriteKeys(
    map: Record<string, string>,
    from: string,
    to: string
  ): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(map)) {
      if (key === from || key.startsWith(`${from}/`)) {
        out[to + key.slice(from.length)] = value;
      } else {
        out[key] = value;
      }
    }
    return out;
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
      openFile(path);
      setError(null);
      return true;
    } finally {
      setPending(false);
    }
  }

  async function createSlide() {
    const usedNumbers = Object.keys(files)
      .map((path) => /^deck\/(\d+)-/.exec(path)?.[1])
      .filter((n): n is string => Boolean(n))
      .map(Number);
    const next = (usedNumbers.length > 0 ? Math.max(...usedNumbers) : 0) + 1;
    const number = String(next).padStart(2, "0");

    let path = `deck/${number}-new-slide/page.tsx`;
    let attempt = 2;
    while (files[path]) {
      path = `deck/${number}-new-slide-${attempt}/page.tsx`;
      attempt++;
    }
    await createFile(path, NEW_SLIDE_CONTENT);
  }

  async function renamePath(from: string, to: string) {
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
      const withoutPath = (map: Record<string, string>) =>
        Object.fromEntries(
          Object.entries(map).filter(
            ([key]) => !(key === path || key.startsWith(`${path}/`))
          )
        );
      setFiles((prev) => withoutPath(prev));
      setSavedFiles((prev) => withoutPath(prev));
      const remaining = openPaths.filter(
        (openPath) => !(openPath === path || openPath.startsWith(`${path}/`))
      );
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

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-border px-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/decks"
            aria-label="Back to decks"
            className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
          >
            <ArrowLeftIcon />
          </Link>
          <div className="min-w-0">
            <p className="font-ui-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Workspace
            </p>
            <h1 className="truncate text-sm leading-tight font-medium">{title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {error ? (
            <span className="max-w-64 truncate text-xs text-destructive">{error}</span>
          ) : null}
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

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-60 shrink-0 flex-col border-r border-border">
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3">
            <span className="font-ui-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              deck/
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon-xs" aria-label="Add" />
                }
              >
                <PlusIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={createSlide}>
                  <PresentationIcon />
                  New slide
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setDraftValue("deck/");
                    setDialog({ kind: "new-file" });
                  }}
                >
                  <FilePlusIcon />
                  New file…
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => mediaInputRef.current?.click()}
                >
                  <ImagePlusIcon />
                  Upload media…
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div className="py-2">
              <FileTree
                paths={Object.keys(files)}
                activePath={activePath}
                onOpen={openFile}
                onRename={(path) => {
                  setDraftValue(path);
                  setDialog({ kind: "rename", path });
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

        <section className="flex min-w-0 flex-1 flex-col">
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
                        "group flex shrink-0 cursor-pointer items-center gap-2 border-r border-border px-3 font-ui-mono text-xs transition-colors",
                        isActive
                          ? "bg-card text-foreground"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      )}
                    >
                      <span className="max-w-44 truncate">{baseName(path)}</span>
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

        <aside className="flex w-[320px] shrink-0 flex-col border-l border-border xl:w-[400px]">
          <div className="flex h-10 shrink-0 items-center border-b border-border px-3">
            <span className="font-ui-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Preview
            </span>
          </div>
          <DeckPreview deckId={deckId} files={files} activePath={activePath} />
        </aside>
      </div>

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

      <PathDialog
        open={dialog?.kind === "new-file"}
        title="New file"
        description="Paths live under deck/ — folders are created implicitly. Example: deck/04-metrics/page.tsx"
        draft={draftValue}
        onDraftChange={setDraftValue}
        confirmLabel="Create file"
        pending={pending}
        onCancel={() => setDialog(null)}
        onConfirm={async () => {
          const path = draftValue.trim();
          if (!path.startsWith("deck/")) {
            setError("Paths must start with deck/");
            return;
          }
          if (await createFile(path, "")) setDialog(null);
        }}
      />

      <PathDialog
        open={dialog?.kind === "rename"}
        title="Rename file"
        description="Renames the file in place. Folders not shown in the tree can be renamed by path."
        draft={draftValue}
        onDraftChange={setDraftValue}
        confirmLabel="Rename"
        pending={pending}
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          if (dialog?.kind === "rename") {
            void renamePath(dialog.path, draftValue.trim());
          }
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
                ? `This removes ${deleteSubtreeCount} file${deleteSubtreeCount === 1 ? "" : "s"} under ${dialog.path}. This cannot be undone.`
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

function PathDialog({
  open,
  title,
  description,
  draft,
  onDraftChange,
  confirmLabel,
  pending,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  draft: string;
  onDraftChange: (value: string) => void;
  confirmLabel: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="deck-path">Path</Label>
          <Input
            id="deck-path"
            value={draft}
            autoFocus
            spellCheck={false}
            className="font-ui-mono text-xs"
            onChange={(event) => onDraftChange(event.target.value)}
            onFocus={(event) => event.target.select()}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void onConfirm();
              }
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={() => void onConfirm()} disabled={pending}>
            {pending ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
