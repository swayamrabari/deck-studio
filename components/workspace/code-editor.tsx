"use client";

import { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { createTheme } from "@uiw/codemirror-themes";
import { tags as t } from "@lezer/highlight";
import { javascript } from "@codemirror/lang-javascript";
import { css } from "@codemirror/lang-css";

/**
 * The studio code editor: CodeMirror 6 wearing the app's tokens.
 * Chrome is grayscale (vars); syntax highlighting stays restrained —
 * three muted hues, everything else neutral.
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

export function CodeEditor({
  path,
  value,
  onChange,
}: {
  path: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const extensions = useMemo(() => languageFor(path), [path]);

  return (
    <div className="h-full min-h-0 overflow-hidden">
      <CodeMirror
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
