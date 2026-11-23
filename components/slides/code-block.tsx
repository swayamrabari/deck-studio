import {
  Highlight,
  type Language,
  type PrismTheme,
} from "prism-react-renderer";

import { cn } from "cn";

/** Restrained, deck-token syntax palette — three muted hues. */
const deckCodeTheme: PrismTheme = {
  plain: { color: "#e8ecf3", backgroundColor: "transparent" },
  styles: [
    { types: ["comment", "prolog", "doctype"], style: { color: "oklch(0.6 0 0)", fontStyle: "italic" } },
    { types: ["keyword", "builtin", "tag", "selector"], style: { color: "oklch(0.78 0.08 255)" } },
    { types: ["string", "attr-value", "char", "inserted"], style: { color: "oklch(0.8 0.07 150)" } },
    { types: ["number", "boolean", "constant"], style: { color: "oklch(0.8 0.07 300)" } },
    { types: ["function", "class-name", "maybe-class-name"], style: { color: "oklch(0.83 0.07 85)" } },
    { types: ["operator", "punctuation"], style: { color: "oklch(0.62 0 0)" } },
    { types: ["attribute", "property"], style: { color: "oklch(0.82 0.05 200)" } },
  ],
};

export function CodeBlock({
  code,
  language = "tsx",
  title,
  highlight = [],
  lineNumbers = true,
}: {
  code: string;
  language?: string;
  title?: string;
  /** 1-based line numbers to emphasize. */
  highlight?: number[];
  lineNumbers?: boolean;
}) {
  const trimmed = code.replace(/^\n+/, "").replace(/\s+$/, "");

  return (
    <div className="overflow-hidden rounded-xl border border-deck-surface bg-deck-surface/50">
      {title ? (
        <div className="flex items-center justify-between border-b border-deck-surface px-5 py-3">
          <span className="font-mono text-xs text-deck-muted">{title}</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-deck-muted/70">
            {language}
          </span>
        </div>
      ) : null}
      <Highlight code={trimmed} language={language as Language} theme={deckCodeTheme}>
        {({ tokens, getLineProps, getTokenProps }) => (
          <pre className="overflow-x-auto px-5 py-4 font-mono text-[15px] leading-relaxed">
            {tokens.map((line, lineIndex) => {
              const lineNumber = lineIndex + 1;
              const isHighlighted = highlight.includes(lineNumber);
              return (
                <div
                  key={lineIndex}
                  {...getLineProps({ line })}
                  className={cn(
                    "flex gap-4",
                    isHighlighted && "-mx-5 bg-deck-accent/10 px-5"
                  )}
                >
                  {lineNumbers ? (
                    <span className="w-6 shrink-0 select-none text-right text-deck-muted/60">
                      {lineNumber}
                    </span>
                  ) : null}
                  <span className="whitespace-pre">
                    {line.map((token, tokenIndex) => (
                      <span key={tokenIndex} {...getTokenProps({ token })} />
                    ))}
                  </span>
                </div>
              );
            })}
          </pre>
        )}
      </Highlight>
    </div>
  );
}
