import { autoFormat, classifyLine, type FormatReport } from '@cifrasync/core';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { EditorSelection, EditorState, RangeSetBuilder } from '@codemirror/state';
import {
  Decoration,
  EditorView,
  keymap,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

/** Ações do editor expostas para a barra de botões. */
export interface CifraEditorApi {
  /** Envolve as linhas selecionadas com marcações de bloco, ex.: {refrao:1} … {/refrao}. */
  wrapLines(open: string, close: string): void;
  /** Envolve um trecho de uma linha com "((…))" (2ª voz). Sem seleção, envolve as linhas em {voz2}. */
  markVoice2(): void;
  /** Insere um título de seção (ex.: "[Introdução]") acima da linha do cursor. */
  insertHeader(title: string): void;
  /** Envolve as linhas [from, to] (base 0) com marcações. */
  wrapLineRange(from: number, to: number, open: string, close: string): void;
  /** Formata o texto inteiro. */
  formatAll(): FormatReport;
  focus(): void;
}

const LINE_CLASS: Record<string, string> = {
  chords: 'cm-l-chords',
  tab: 'cm-l-tab',
  header: 'cm-l-header',
  directive: 'cm-l-directive',
  comment: 'cm-l-comment',
};

const voice2Mark = Decoration.mark({ class: 'cm-voice2' });

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  for (const { from, to } of view.visibleRanges) {
    let pos = from;
    while (pos <= to) {
      const line = view.state.doc.lineAt(pos);
      const cls = LINE_CLASS[classifyLine(line.text)];
      if (cls) builder.add(line.from, line.from, Decoration.line({ class: cls }));
      const re = /\(\([^)]*\)\)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(line.text)))
        builder.add(line.from + m.index, line.from + m.index + m[0].length, voice2Mark);
      pos = line.to + 1;
    }
  }
  return builder.finish();
}

const highlighter = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }
    update(u: ViewUpdate) {
      if (u.docChanged || u.viewportChanged) this.decorations = buildDecorations(u.view);
    }
  },
  { decorations: (v) => v.decorations },
);

const theme = EditorView.theme({
  '&': {
    fontSize: '15px',
    backgroundColor: 'var(--surface)',
    color: 'var(--text)',
    height: '100%',
  },
  '.cm-scroller': { fontFamily: 'var(--font-mono)', lineHeight: '1.5' },
  '.cm-content': { caretColor: 'var(--accent)', padding: '12px 0' },
  '&.cm-focused': { outline: 'none' },
  '.cm-gutters': { display: 'none' },
  '.cm-activeLine': { backgroundColor: 'color-mix(in srgb, var(--accent) 6%, transparent)' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
    backgroundColor: 'color-mix(in srgb, var(--accent) 25%, transparent) !important',
  },
  '.cm-l-chords': { color: 'var(--song-chord)', fontWeight: '700' },
  '.cm-l-tab': { color: 'var(--song-tab)' },
  '.cm-l-header': { fontWeight: '700' },
  '.cm-l-directive': { color: 'var(--muted)', fontStyle: 'italic' },
  '.cm-l-comment': { color: 'var(--song-note)', fontStyle: 'italic' },
  '.cm-voice2': { color: 'var(--song-voice2)', fontStyle: 'italic' },
});

export const CifraEditor = forwardRef<
  CifraEditorApi,
  {
    value: string;
    onChange: (value: string) => void;
    onPasteFormatted?: (report: FormatReport) => void;
    onSave?: () => void;
    placeholder?: string;
  }
>(function CifraEditor({ value, onChange, onPasteFormatted, onSave }, ref) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const callbacks = useRef({ onChange, onPasteFormatted, onSave });
  callbacks.current = { onChange, onPasteFormatted, onSave };

  useEffect(() => {
    const v = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          history(),
          keymap.of([
            {
              key: 'Mod-s',
              preventDefault: true,
              run: () => {
                callbacks.current.onSave?.();
                return true;
              },
            },
            ...defaultKeymap,
            ...historyKeymap,
          ]),
          EditorView.lineWrapping,
          highlighter,
          theme,
          EditorView.contentAttributes.of({
            'aria-label': 'Letra e cifra',
            spellcheck: 'false',
            autocapitalize: 'off',
            autocorrect: 'off',
          }),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) callbacks.current.onChange(u.state.doc.toString());
          }),
          EditorView.domEventHandlers({
            paste(event, v) {
              const text = event.clipboardData?.getData('text/plain');
              if (!text || !text.includes('\n')) return false;
              event.preventDefault();
              const { text: formatted, report } = autoFormat(text);
              v.dispatch(v.state.replaceSelection(formatted));
              callbacks.current.onPasteFormatted?.(report);
              return true;
            },
          }),
        ],
      }),
    });
    view.current = v;
    return () => v.destroy();
    // o editor é criado uma vez; mudanças externas entram pelo efeito abaixo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // valor trocado de fora (ex.: carregou a música do banco)
  useEffect(() => {
    const v = view.current;
    if (v && v.state.doc.toString() !== value) {
      v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } });
    }
  }, [value]);

  useImperativeHandle(ref, () => {
    const wrapLineRange = (fromLine: number, toLine: number, open: string, close: string) => {
      const v = view.current!;
      const doc = v.state.doc;
      const first = doc.line(Math.min(fromLine + 1, doc.lines));
      const last = doc.line(Math.min(toLine + 1, doc.lines));
      v.dispatch({
        changes: [
          { from: first.from, insert: `${open}\n` },
          { from: last.to, insert: `\n${close}` },
        ],
      });
      v.focus();
    };
    return {
      wrapLineRange,
      insertHeader(title) {
        const v = view.current!;
        const line = v.state.doc.lineAt(v.state.selection.main.from);
        v.dispatch({ changes: { from: line.from, insert: `[${title}]\n` } });
        v.focus();
      },
      wrapLines(open, close) {
        const v = view.current!;
        const sel = v.state.selection.main;
        const a = v.state.doc.lineAt(sel.from).number - 1;
        const b = v.state.doc.lineAt(sel.to).number - 1;
        wrapLineRange(a, b, open, close);
      },
      markVoice2() {
        const v = view.current!;
        const sel = v.state.selection.main;
        const sameLine = v.state.doc.lineAt(sel.from).number === v.state.doc.lineAt(sel.to).number;
        if (!sel.empty && sameLine) {
          v.dispatch({
            changes: [
              { from: sel.from, insert: '((' },
              { from: sel.to, insert: '))' },
            ],
            selection: EditorSelection.range(sel.from + 2, sel.to + 2),
          });
          v.focus();
        } else {
          this.wrapLines('{voz2}', '{/voz2}');
        }
      },
      formatAll() {
        const v = view.current!;
        const { text, report } = autoFormat(v.state.doc.toString());
        v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: text } });
        return report;
      },
      focus() {
        view.current?.focus();
      },
    };
  }, []);

  return (
    <div
      ref={host}
      className="h-full min-h-[50vh] overflow-hidden rounded-xl border border-border"
    />
  );
});
