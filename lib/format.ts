import type { Options, Plugin } from "prettier";

/**
 * In-browser formatting with Prettier's standalone build. Plugins are
 * loaded lazily (dynamic imports), so the workspace bundle stays light
 * until the first format runs.
 */

type PluginKey = "typescript" | "estree" | "babel" | "postcss";

let standalonePromise: Promise<typeof import("prettier/standalone")> | null =
  null;
const pluginPromises = new Map<PluginKey, Promise<Plugin>>();

function loadStandalone() {
  standalonePromise ??= import("prettier/standalone");
  return standalonePromise;
}

function loadPlugin(key: PluginKey): Promise<Plugin> {
  let promise = pluginPromises.get(key);
  if (!promise) {
    promise =
      key === "typescript"
        ? import("prettier/plugins/typescript")
        : key === "estree"
          ? import("prettier/plugins/estree")
          : key === "babel"
            ? import("prettier/plugins/babel")
            : import("prettier/plugins/postcss");
    pluginPromises.set(key, promise as Promise<Plugin>);
  }
  return promise;
}

function parserFor(path: string): { parser: string; plugins: PluginKey[] } | null {
  if (path.endsWith(".tsx") || path.endsWith(".ts")) {
    return { parser: "typescript", plugins: ["typescript", "estree"] };
  }
  if (path.endsWith(".jsx") || path.endsWith(".js") || path.endsWith(".mjs")) {
    return { parser: "babel", plugins: ["babel", "estree"] };
  }
  if (path.endsWith(".css")) {
    return { parser: "css", plugins: ["postcss"] };
  }
  return null;
}

const FORMAT_OPTIONS: Options = {
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: false,
  trailingComma: "all",
};

/**
 * Formats deck source; returns null when the file type is unsupported or
 * the code has a syntax error (the caller leaves the buffer untouched).
 */
export async function formatCode(
  code: string,
  path: string
): Promise<string | null> {
  const target = parserFor(path);
  if (!target) return null;

  try {
    const [prettier, ...plugins] = await Promise.all([
      loadStandalone(),
      ...target.plugins.map((key) => loadPlugin(key)),
    ]);
    return await prettier.format(code, {
      ...FORMAT_OPTIONS,
      parser: target.parser,
      plugins,
      filepath: path,
    });
  } catch {
    return null;
  }
}
