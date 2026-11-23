"use client";

import { useState, type ReactNode } from "react";
import {
  ChevronRightIcon,
  FileCodeIcon,
  FileTextIcon,
  FolderIcon,
  FolderOpenIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";

import { cn } from "cn";

export interface FileNode {
  kind: "file";
  name: string;
  path: string;
}

export interface FolderNode {
  kind: "folder";
  name: string;
  path: string;
  children: TreeNode[];
}

export type TreeNode = FileNode | FolderNode;

/** Builds the visible tree from flat deck paths (`deck/01-title/page.tsx`). */
export function buildTree(paths: string[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const fullPath of [...paths].sort()) {
    const segments = fullPath.split("/");
    if (segments[0] !== "deck") continue;

    let level = root;
    let prefix = "deck";

    for (let i = 1; i < segments.length; i++) {
      const segment = segments[i];
      prefix = `${prefix}/${segment}`;
      const isFile = i === segments.length - 1;

      if (isFile) {
        if (!level.some((node) => node.kind === "file" && node.name === segment)) {
          level.push({ kind: "file", name: segment, path: prefix });
        }
      } else {
        let folder = level.find(
          (node): node is FolderNode => node.kind === "folder" && node.name === segment
        );
        if (!folder) {
          folder = { kind: "folder", name: segment, path: prefix, children: [] };
          level.push(folder);
        }
        level = folder.children;
      }
    }
  }

  const sortLevel = (nodes: TreeNode[]) => {
    nodes.sort((a, b) =>
      a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === "folder" ? -1 : 1
    );
    for (const node of nodes) {
      if (node.kind === "folder") sortLevel(node.children);
    }
  };
  sortLevel(root);

  return root;
}

function fileIcon(name: string) {
  return /\.(tsx?|jsx?)$/.test(name) ? FileCodeIcon : FileTextIcon;
}

export function FileTree({
  paths,
  activePath,
  onOpen,
  onRename,
  onDelete,
}: {
  paths: string[];
  activePath: string | null;
  onOpen: (path: string) => void;
  onRename: (path: string) => void;
  onDelete: (path: string, recursive: boolean) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggle(path: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function renderNodes(nodes: TreeNode[], depth: number): ReactNode {
    return nodes.map((node) => {
      const indent = 8 + depth * 12;

      if (node.kind === "folder") {
        const isCollapsed = collapsed.has(node.path);
        return (
          <div key={node.path}>
            <div
              role="button"
              tabIndex={0}
              className="group/row flex cursor-pointer items-center gap-1.5 py-1 pr-2 text-[13px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              style={{ paddingLeft: indent }}
              onClick={() => toggle(node.path)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  toggle(node.path);
                }
              }}
            >
              <ChevronRightIcon
                className={cn(
                  "size-3 shrink-0 transition-transform",
                  !isCollapsed && "rotate-90"
                )}
              />
              {isCollapsed ? (
                <FolderIcon className="size-3.5 shrink-0" />
              ) : (
                <FolderOpenIcon className="size-3.5 shrink-0" />
              )}
              <span className="truncate">{node.name}</span>
              <button
                type="button"
                aria-label={`Delete folder ${node.path}`}
                className="ml-auto cursor-pointer rounded-sm p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-background hover:text-foreground group-hover/row:opacity-100 focus-visible:opacity-100"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(node.path, true);
                }}
              >
                <Trash2Icon className="size-3" />
              </button>
            </div>
            {!isCollapsed && renderNodes(node.children, depth + 1)}
          </div>
        );
      }

      const Icon = fileIcon(node.name);
      const isActive = activePath === node.path;
      return (
        <div
          key={node.path}
          role="button"
          tabIndex={0}
          className={cn(
            "group/row flex cursor-pointer items-center gap-1.5 py-1 pr-2 text-[13px] transition-colors",
            isActive
              ? "bg-card text-foreground"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          )}
          style={{ paddingLeft: indent }}
          onClick={() => onOpen(node.path)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onOpen(node.path);
            }
          }}
        >
          {/* Arrow column spacer — keeps file rows aligned with folders. */}
          <span aria-hidden className="size-3 shrink-0" />
          <Icon className="size-3.5 shrink-0" />
          <span className="truncate">{node.name}</span>
          <span className="ml-auto flex items-center gap-1 opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100">
            <button
              type="button"
              aria-label={`Rename ${node.path}`}
              className="cursor-pointer rounded-sm p-0.5 hover:bg-background hover:text-foreground"
              onClick={(event) => {
                event.stopPropagation();
                onRename(node.path);
              }}
            >
              <PencilIcon className="size-3" />
            </button>
            <button
              type="button"
              aria-label={`Delete ${node.path}`}
              className="cursor-pointer rounded-sm p-0.5 hover:bg-background hover:text-foreground"
              onClick={(event) => {
                event.stopPropagation();
                onDelete(node.path, false);
              }}
            >
              <Trash2Icon className="size-3" />
            </button>
          </span>
        </div>
      );
    });
  }

  return <div>{renderNodes(buildTree(paths), 0)}</div>;
}
