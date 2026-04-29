<script lang="ts">
  import { onMount } from "svelte";
  import {
    EditorView,
    lineNumbers,
    highlightActiveLineGutter,
    highlightActiveLine,
    drawSelection,
    keymap,
  } from "@codemirror/view";
  import { EditorState, Compartment, type Extension } from "@codemirror/state";
  import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
  import {
    bracketMatching,
    syntaxHighlighting,
    defaultHighlightStyle,
    LanguageDescription,
  } from "@codemirror/language";
  import { classHighlighter } from "@lezer/highlight";
  import { oneDarkHighlightStyle } from "@codemirror/theme-one-dark";
  import { languages } from "@codemirror/language-data";
  import { dbg, dbgWarn } from "$lib/utils/debug";
  import { fileName } from "$lib/utils/format";
  import { resolveStaticLanguage, resolveByFirstLine } from "$lib/utils/codemirror-languages";

  let {
    content = $bindable(""),
    filePath = "",
    readonly = false,
    onsave,
    class: className = "",
  }: {
    content: string;
    filePath?: string;
    readonly?: boolean;
    onsave?: () => void;
    class?: string;
  } = $props();

  let editorEl: HTMLDivElement | undefined = $state();
  let view: EditorView | undefined = $state();
  let updating = false;

  const langCompartment = new Compartment();

  /** Race condition guard: only apply the latest language resolution. */
  let langSeq = 0;

  /**
   * Resolve language extensions for a file path.
   *
   * 1. Static mapping (sync) — covers ~20 common languages
   * 2. Dynamic fallback via @codemirror/language-data (async, with try/catch)
   * 3. Returns [] on failure (plain text, never throws)
   */
  async function resolveLanguage(path: string): Promise<Extension[]> {
    const name = fileName(path);

    // 1. Static mapping (sync — no dynamic chunk loading)
    const staticResult = resolveStaticLanguage(name);
    if (staticResult) {
      dbg("code-editor", "static-hit", { name });
      return staticResult;
    }

    // 2. Dynamic fallback: language-data auto-detection
    const desc = LanguageDescription.matchFilename(languages, name);
    if (desc) {
      try {
        const support = await desc.load();
        dbg("code-editor", "dynamic-hit", { name, lang: desc.name });
        return [support];
      } catch (e) {
        dbgWarn("code-editor", "dynamic-failed", { name, lang: desc.name, error: e });
        // Fall through to first-line detection below
      }
    }

    // 3. First-line detection (shebang, XML declaration, JSON brace)
    if (content) {
      const firstLine = content.trimStart().split("\n")[0] ?? "";
      const guess = resolveByFirstLine(firstLine);
      if (guess) {
        dbg("code-editor", "first-line-hit", { name, firstLine: firstLine.slice(0, 40) });
        return guess;
      }
    }

    dbg("code-editor", "plain-text-fallback", { name });
    return [];
  }

  /** Check if syntax highlighting styles are actually applied after language loads. Run once. */
  let styleCheckDone = false;
  function verifySyntaxStyles(v: EditorView) {
    if (styleCheckDone) return;
    styleCheckDone = true;
    // Give parser time to tokenize + style-mod to inject CSS
    requestAnimationFrame(() => {
      if (!v.dom.isConnected) return;
      const baseColor = getComputedStyle(v.contentDOM).color;
      // Sample up to 20 token spans — enough to detect missing styles without perf cost
      const spans = v.contentDOM.querySelectorAll(".cm-line span");
      const limit = Math.min(spans.length, 20);
      let hasHighlight = false;
      for (let i = 0; i < limit; i++) {
        if (getComputedStyle(spans[i]).color !== baseColor) {
          hasHighlight = true;
          break;
        }
      }
      if (limit > 0 && !hasHighlight) {
        dbgWarn("code-editor", "style-injection-failed", {
          baseColor,
          sampledSpans: limit,
          msg: "Language loaded but no token has distinct color — styles may not be injected",
        });
      }
    });
  }

  onMount(() => {
    if (!editorEl) return;

    dbg("code-editor", "mount", { filePath, readonly });

    const state = EditorState.create({
      doc: content,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        drawSelection(), // Renders CM6 cursor (native caret is hidden via caret-color: transparent in app.css)
        bracketMatching(),
        history(),
        keymap.of([
          {
            key: "Mod-s",
            run: () => {
              onsave?.();
              return true;
            },
          },
          ...defaultKeymap,
          ...historyKeymap,
        ]),
        syntaxHighlighting(classHighlighter),
        syntaxHighlighting(oneDarkHighlightStyle, { fallback: false }),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        EditorView.editable.of(!readonly),
        EditorState.readOnly.of(readonly),
        langCompartment.of([]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !updating) {
            updating = true;
            content = update.state.doc.toString();
            updating = false;
          }
        }),
      ],
    });

    view = new EditorView({ state, parent: editorEl });

    // Load language support
    const seq = ++langSeq;
    resolveLanguage(filePath).then((lang) => {
      if (seq !== langSeq || !view) return; // stale — user already switched files
      view.dispatch({ effects: langCompartment.reconfigure(lang) });
      if (lang.length > 0) verifySyntaxStyles(view);
    });

    return () => {
      view?.destroy();
      view = undefined;
    };
  });

  // Sync external content changes into CM6
  $effect(() => {
    if (view && !updating && content !== view.state.doc.toString()) {
      updating = true;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: content },
      });
      updating = false;
    }
  });

  // Reconfigure language when filePath changes
  $effect(() => {
    if (!view) return;
    const _path = filePath; // track dependency
    const seq = ++langSeq;
    resolveLanguage(_path).then((lang) => {
      if (seq !== langSeq || !view) return; // stale — user already switched files
      view.dispatch({ effects: langCompartment.reconfigure(lang) });
      if (lang.length > 0) verifySyntaxStyles(view);
    });
  });
</script>

<div bind:this={editorEl} class="code-editor-wrapper {className}"></div>

<style>
  .code-editor-wrapper {
    overflow: hidden;
  }
  .code-editor-wrapper :global(.cm-editor) {
    height: 100%;
  }
  /* scroller flex layout is enforced globally in app.css */

  /*
   * Static tok-* fallback — provides syntax highlighting when style-mod
   * dynamic CSS injection fails (Intel Mac WKWebView).
   *
   * These rules have lower specificity than style-mod's generated classes,
   * so they only take visual effect when the dynamic styles are absent.
   * Colors match oneDark (dark) / defaultHighlightStyle (light).
   */

  /* ── Light mode ── */
  .code-editor-wrapper :global(.tok-keyword) {
    color: #708;
  }
  .code-editor-wrapper :global(.tok-atom) {
    color: #219;
  }
  .code-editor-wrapper :global(.tok-bool) {
    color: #219;
  }
  .code-editor-wrapper :global(.tok-number) {
    color: #164;
  }
  .code-editor-wrapper :global(.tok-string) {
    color: #a11;
  }
  .code-editor-wrapper :global(.tok-string2) {
    color: #e40;
  }
  .code-editor-wrapper :global(.tok-comment) {
    color: #940;
    font-style: italic;
  }
  .code-editor-wrapper :global(.tok-variableName) {
    color: #05a;
  }
  .code-editor-wrapper :global(.tok-variableName2) {
    color: #085;
  }
  .code-editor-wrapper :global(.tok-variableName.tok-definition) {
    color: #00f;
  }
  .code-editor-wrapper :global(.tok-typeName) {
    color: #085;
  }
  .code-editor-wrapper :global(.tok-namespace) {
    color: #085;
  }
  .code-editor-wrapper :global(.tok-className) {
    color: #167;
  }
  .code-editor-wrapper :global(.tok-macroName) {
    color: #256;
  }
  .code-editor-wrapper :global(.tok-propertyName) {
    color: #00c;
  }
  .code-editor-wrapper :global(.tok-propertyName.tok-definition) {
    color: #00c;
  }
  .code-editor-wrapper :global(.tok-operator) {
    color: #708;
  }
  .code-editor-wrapper :global(.tok-meta) {
    color: #555;
  }
  .code-editor-wrapper :global(.tok-punctuation) {
    color: #555;
  }
  .code-editor-wrapper :global(.tok-link) {
    color: #219;
    text-decoration: underline;
  }
  .code-editor-wrapper :global(.tok-heading) {
    color: #00f;
    font-weight: bold;
  }
  .code-editor-wrapper :global(.tok-emphasis) {
    font-style: italic;
  }
  .code-editor-wrapper :global(.tok-strong) {
    font-weight: bold;
  }
  .code-editor-wrapper :global(.tok-invalid) {
    color: #f00;
  }
  .code-editor-wrapper :global(.tok-inserted) {
    color: #164;
  }
  .code-editor-wrapper :global(.tok-deleted) {
    color: #a11;
    text-decoration: line-through;
  }

  /* ── Dark mode (VSCode Dark+ aligned) ── */
  :global(.dark) .code-editor-wrapper :global(.tok-keyword) {
    color: #569cd6;
  }
  :global(.dark) .code-editor-wrapper :global(.tok-atom) {
    color: #569cd6;
  }
  :global(.dark) .code-editor-wrapper :global(.tok-bool) {
    color: #569cd6;
  }
  :global(.dark) .code-editor-wrapper :global(.tok-number) {
    color: #b5cea8;
  }
  :global(.dark) .code-editor-wrapper :global(.tok-string) {
    color: #ce9178;
  }
  :global(.dark) .code-editor-wrapper :global(.tok-string2) {
    color: #ce9178;
  }
  :global(.dark) .code-editor-wrapper :global(.tok-comment) {
    color: #6a9955;
    font-style: italic;
  }
  :global(.dark) .code-editor-wrapper :global(.tok-variableName) {
    color: #9cdcfe;
  }
  :global(.dark) .code-editor-wrapper :global(.tok-variableName2) {
    color: #9cdcfe;
  }
  :global(.dark) .code-editor-wrapper :global(.tok-variableName.tok-definition) {
    color: #dcdcaa;
  }
  :global(.dark) .code-editor-wrapper :global(.tok-typeName) {
    color: #4ec9b0;
  }
  :global(.dark) .code-editor-wrapper :global(.tok-namespace) {
    color: #4ec9b0;
  }
  :global(.dark) .code-editor-wrapper :global(.tok-className) {
    color: #4ec9b0;
  }
  :global(.dark) .code-editor-wrapper :global(.tok-macroName) {
    color: #dcdcaa;
  }
  :global(.dark) .code-editor-wrapper :global(.tok-propertyName) {
    color: #9cdcfe;
  }
  :global(.dark) .code-editor-wrapper :global(.tok-propertyName.tok-definition) {
    color: #9cdcfe;
  }
  :global(.dark) .code-editor-wrapper :global(.tok-operator) {
    color: #d4d4d4;
  }
  :global(.dark) .code-editor-wrapper :global(.tok-meta) {
    color: #d4d4d4;
  }
  :global(.dark) .code-editor-wrapper :global(.tok-punctuation) {
    color: #d4d4d4;
  }
  :global(.dark) .code-editor-wrapper :global(.tok-link) {
    color: #569cd6;
    text-decoration: underline;
  }
  :global(.dark) .code-editor-wrapper :global(.tok-heading) {
    color: #569cd6;
    font-weight: bold;
  }
  :global(.dark) .code-editor-wrapper :global(.tok-emphasis) {
    font-style: italic;
  }
  :global(.dark) .code-editor-wrapper :global(.tok-strong) {
    font-weight: bold;
  }
  :global(.dark) .code-editor-wrapper :global(.tok-invalid) {
    color: #f44747;
  }
  :global(.dark) .code-editor-wrapper :global(.tok-inserted) {
    color: #b5cea8;
  }
  :global(.dark) .code-editor-wrapper :global(.tok-deleted) {
    color: #ce9178;
    text-decoration: line-through;
  }
</style>
