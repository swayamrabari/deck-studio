"use client";

import {
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  type Ref,
} from "react";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { createTheme } from "@uiw/codemirror-themes";
import { EditorView, keymap } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import { javascript } from "@codemirror/lang-javascript";
import { css } from "@codemirror/lang-css";

import { formatCode } from "@/lib/format";

/**
 * The studio code editor: CodeMirror 6 wearing the app's tokens.
 * Chrome is grayscale (vars); syntax highlighting stays restrained —
 * three muted hues, everything else neutral.
 *
 * Formatting: Shift+Alt+F anywhere, the workspace toolbar button, and
 * automatically after a paste.
 */
const studioTheme = createTheme({
  theme: "dark",
  settings: {
    background: "var(--background)",
    foreground: "var(--foreground)",
    caret: "var(--foreground)",
    selection: "var(--accent)",
    selectionMatch: "var(--accent)",
    lineHighlight: "var(--muted)",
    gutterBackground: "var(--background)",
    gutterForeground: "var(--muted-foreground)",
    gutterBorder: "transparent",
    fontFamily: "var(--font-ui-mono), ui-monospace, monospace",
    fontSize: "13px",
  },
  styles: [
    { tag: t.comment, color: "var(--muted-foreground)", fontStyle: "italic" },
    { tag: [t.keyword, t.operatorKeyword, t.modifier], color: "oklch(0.78 0.08 255)" },
    { tag: [t.string, t.special(t.string)], color: "oklch(0.8 0.07 150)" },
    { tag: [t.number, t.bool, t.null], color: "oklch(0.8 0.07 300)" },
    { tag: [t.typeName, t.className, t.tagName], color: "oklch(0.83 0.07 85)" },
    { tag: [t.propertyName, t.attributeName], color: "oklch(0.82 0.05 200)" },
    { tag: [t.variableName, t.function(t.variableName)], color: "var(--foreground)" },
    { tag: [t.punctuation, t.bracket, t.angleBracket], color: "var(--muted-foreground)" },
    { tag: t.invalid, color: "oklch(0.7 0.19 25)" },
  ],
});

function languageFor(path: string) {
  if (/\.(tsx?|jsx?|mts)$/.test(path)) {
    return [javascript({ jsx: true, typescript: true })];
  }
  if (path.endsWith(".css")) return [css()];
  return [];
}

export interface CodeEditorHandle {
  format: () => void;
}

export function CodeEditor({
  path,
  value,
  onChange,
  ref,
}: {
  path: string;
  value: string;
  onChange: (value: string) => void;
  ref?: Ref<CodeEditorHandle>;
}) {
  const codeMirrorRef = useRef<ReactCodeMirrorRef>(null);

  // Formatting works on the view it is given — CodeMirror passes the view
  // into its own event handlers, and the imperative handle bridges the
  // ref — so no handler reads refs during render.
  const formatWith = useCallback(
    async (view: EditorView) => {
      const current = view.state.doc.toString();
      const formatted = await formatCode(current, path);
      if (formatted === null || formatted === current) return;

      // Preserve the cursor's line/column across the full-document replace.
      const head = view.state.selection.main.head;
      const line = view.state.doc.lineAt(head);
      const column = head - line.from;

      view.dispatch({
        changes: { from: 0, to: current.length, insert: formatted },
      });
      const targetLine = view.state.doc.line(
        Math.min(line.number, view.state.doc.lines)
      );
      view.dispatch({
        selection: {
          anchor: Math.min(targetLine.from + column, targetLine.to),
        },
      });
      view.focus();
    },
    [path]
  );

  useImperativeHandle(
    ref,
    () => ({
      format: () => {
        const view = codeMirrorRef.current?.view;
        if (view) void formatWith(view);
      },
    }),
    [formatWith]
  );

  const formattingExtensions = useMemo(
    () => [
      // Format automatically after a paste lands in the document.
      EditorView.domEventHandlers({
        paste: (_event, view) => {
          window.setTimeout(() => void formatWith(view), 0);
          return false;
        },
      }),
      keymap.of([
        {
          key: "Shift-Alt-f",
          run: (view) => {
            void formatWith(view);
            return true;
          },
        },
      ]),
    ],
    [formatWith]
  );

  const extensions = useMemo(
    () => [...languageFor(path), ...formattingExtensions],
    [path, formattingExtensions]
  );

  return (
    <div className="h-full min-h-0 overflow-hidden">
      <CodeMirror
        ref={codeMirrorRef}
        value={value}
        onChange={onChange}
        theme={studioTheme}
        height="100%"
        extensions={extensions}
        className="h-full text-[13px] [&_.cm-editor]:h-full [&_.cm-scroller]:leading-relaxed"
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          autocompletion: true,
          bracketMatching: true,
          highlightActiveLine: true,
          highlightActiveLineGutter: false,
          indentOnInput: true,
        }}
      />
    </div>
  );
}
