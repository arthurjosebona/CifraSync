import { detectKey, formatKey, parseKey, parseSong, type FormatReport } from '@cifrasync/core';
import { saveSong, uuidv7 } from '@cifrasync/sync';
import { ArrowLeft, Save, Wand2 } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { CifraEditor, type CifraEditorApi } from '../components/CifraEditor';
import { Page } from '../components/Page';
import { SongView } from '../components/SongView';
import { Button, Field, IconButton, Input, Textarea } from '../components/ui';
import { db, useSong } from '../lib/data';

interface Form {
  title: string;
  artist: string;
  key: string;
  capo: number;
  style: string;
  bpm: string;
  duration: string;
  content: string;
  notes: string;
}

const EMPTY: Form = {
  title: '',
  artist: '',
  key: '',
  capo: 0,
  style: '',
  bpm: '',
  duration: '',
  content: '',
  notes: '',
};

function parseDuration(s: string): number | null {
  const m = /^(\d{1,2}):([0-5]\d)$/.exec(s.trim());
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  const n = Number(s);
  return s.trim() && Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function formatDuration(sec: number | null): string {
  if (!sec) return '';
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

const MARKS: { label: string; open: string; close: string; title: string }[] = [
  { label: 'Refrão 1', open: '{refrao:1}', close: '{/refrao}', title: 'Destacar como refrão 1' },
  { label: 'Refrão 2', open: '{refrao:2}', close: '{/refrao}', title: 'Destacar como refrão 2' },
  { label: 'Refrão 3', open: '{refrao:3}', close: '{/refrao}', title: 'Destacar como refrão 3' },
  { label: 'Tab/Solo', open: '{tab}', close: '{/tab}', title: 'Marcar como tablatura ou solo' },
  { label: 'Nota', open: '{nota}', close: '{/nota}', title: 'Marcar como anotação' },
];

export default function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const existing = useSong(id);
  const editor = useRef<CifraEditorApi>(null);

  const [form, setForm] = useState<Form>(EMPTY);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [report, setReport] = useState<FormatReport | null>(null);
  const [tab, setTab] = useState<'editar' | 'ver'>('editar');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newId] = useState(() => uuidv7());

  if (existing && existing.id !== loadedId) {
    setLoadedId(existing.id);
    setForm({
      title: existing.title,
      artist: existing.artist,
      key: existing.key ?? '',
      capo: existing.capo,
      style: existing.style,
      bpm: existing.bpm ? String(existing.bpm) : '',
      duration: formatDuration(existing.durationSec),
      content: existing.content,
      notes: existing.notes,
    });
  }

  const doc = useMemo(() => parseSong(form.content), [form.content]);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setError(null);
    if (!form.title.trim()) {
      setError('Dê um título para a música.');
      return;
    }
    if (form.key && !parseKey(form.key)) {
      setError(`Tom “${form.key}” não reconhecido. Use, por exemplo, G, F#m ou Bb.`);
      return;
    }
    setSaving(true);
    try {
      const bpm = Number(form.bpm);
      const saved = await saveSong(db, {
        id: id ?? newId,
        title: form.title.trim(),
        artist: form.artist.trim(),
        key: form.key ? formatKey(parseKey(form.key)!) : null,
        capo: form.capo,
        style: form.style.trim(),
        bpm: form.bpm && Number.isFinite(bpm) ? Math.round(bpm) : null,
        durationSec: parseDuration(form.duration),
        content: form.content,
        notes: form.notes,
      });
      navigate(`/musicas/${saved.id}`, { replace: true });
    } finally {
      setSaving(false);
    }
  };

  if (id && existing === undefined) return null;

  const suggestKey = () => {
    const guess = detectKey(doc);
    if (guess) set('key', formatKey(guess.key));
  };

  return (
    <Page
      title={
        <span className="flex items-center gap-1">
          <IconButton label="Voltar" onClick={() => navigate(-1)}>
            <ArrowLeft className="size-5" />
          </IconButton>
          {id ? 'Editar música' : 'Nova música'}
        </span>
      }
      actions={
        <Button variant="primary" onClick={() => void save()} disabled={saving}>
          <Save className="size-4" aria-hidden />
          Salvar
        </Button>
      }
    >
      {error && (
        <p
          role="alert"
          className="mb-3 rounded-lg border border-danger px-3 py-2 text-sm text-danger"
        >
          {error}
        </p>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-6">
        <div className="col-span-2 md:col-span-3">
          <Field label="Título">
            <Input
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              autoFocus={!id}
            />
          </Field>
        </div>
        <div className="col-span-2 md:col-span-3">
          <Field label="Artista">
            <Input value={form.artist} onChange={(e) => set('artist', e.target.value)} />
          </Field>
        </div>
        <Field label="Tom">
          <div className="flex gap-1">
            <Input
              value={form.key}
              onChange={(e) => set('key', e.target.value)}
              placeholder="G, F#m…"
              className="font-mono"
            />
            <IconButton label="Detectar tom pelos acordes" onClick={suggestKey}>
              <Wand2 className="size-4" />
            </IconButton>
          </div>
        </Field>
        <Field label="Capotraste">
          <Input
            type="number"
            min={0}
            max={11}
            value={form.capo}
            onChange={(e) => set('capo', Math.max(0, Math.min(11, Number(e.target.value) || 0)))}
          />
        </Field>
        <Field label="Estilo">
          <Input value={form.style} onChange={(e) => set('style', e.target.value)} />
        </Field>
        <Field label="BPM">
          <Input
            inputMode="numeric"
            value={form.bpm}
            onChange={(e) => set('bpm', e.target.value)}
          />
        </Field>
        <Field label="Duração (m:ss)">
          <Input
            value={form.duration}
            onChange={(e) => set('duration', e.target.value)}
            placeholder="3:45"
          />
        </Field>
      </div>

      <div className="mb-2 flex flex-wrap gap-1">
        {MARKS.slice(0, 3).map((m) => (
          <Button
            key={m.label}
            title={m.title}
            onClick={() => editor.current?.wrapLines(m.open, m.close)}
          >
            {m.label}
          </Button>
        ))}
        <Button
          title="Selecione um trecho de uma linha, ou linhas inteiras"
          onClick={() => editor.current?.markVoice2()}
        >
          2ª voz
        </Button>
        {MARKS.slice(3).map((m) => (
          <Button
            key={m.label}
            title={m.title}
            onClick={() => editor.current?.wrapLines(m.open, m.close)}
          >
            {m.label}
          </Button>
        ))}
        <Button variant="ghost" onClick={() => setReport(editor.current?.formatAll() ?? null)}>
          <Wand2 className="size-4" aria-hidden />
          Formatar
        </Button>
      </div>

      {report && (
        <div className="mb-3 rounded-lg border border-border bg-surface p-3 text-sm" role="status">
          <p>
            Detectei {report.counts.chords} linha(s) de cifra, {report.counts.lyric} de letra e{' '}
            {report.counts.tab} de tablatura.
          </p>
          {report.unknown.length > 0 && (
            <p className="mt-1 text-danger">
              Não reconheci como acorde:{' '}
              {report.unknown.map((u) => `“${u.token}” (linha ${u.line + 1})`).join(', ')}
            </p>
          )}
          {report.chorusSuggestions.map((s) => (
            <p key={s.from} className="mt-1">
              Linhas {s.from + 1}–{s.to + 1} parecem refrão
              {s.reason === 'repeticao' ? ' (se repetem)' : ''}.{' '}
              <button
                type="button"
                className="text-accent underline"
                onClick={() => {
                  editor.current?.wrapLineRange(s.from, s.to, '{refrao:1}', '{/refrao}');
                  setReport(null);
                }}
              >
                Marcar como Refrão 1
              </button>
            </p>
          ))}
          <button
            type="button"
            className="mt-1 text-muted underline"
            onClick={() => setReport(null)}
          >
            Fechar
          </button>
        </div>
      )}

      <div className="mb-2 flex gap-1 md:hidden" role="tablist">
        {(['editar', 'ver'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`min-h-10 flex-1 rounded-lg text-sm ${tab === t ? 'bg-surface-2 font-medium' : 'text-muted'}`}
          >
            {t === 'editar' ? 'Editar' : 'Pré-visualizar'}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className={tab === 'ver' ? 'hidden md:block' : ''}>
          <CifraEditor
            ref={editor}
            value={form.content}
            onChange={(v) => set('content', v)}
            onPasteFormatted={setReport}
            onSave={() => void save()}
          />
          <p className="mt-1 text-xs text-muted">
            Cole a cifra com os acordes na linha de cima e a letra embaixo — a formatação é
            automática.
          </p>
        </div>
        <div
          className={`max-h-[75vh] overflow-y-auto rounded-xl border border-border bg-surface p-4 ${tab === 'editar' ? 'hidden md:block' : ''}`}
        >
          {form.content.trim() ? (
            <SongView doc={doc} />
          ) : (
            <p className="text-muted">A pré-visualização aparece aqui.</p>
          )}
        </div>
      </div>

      <div className="mt-4">
        <Field label="Observações">
          <Textarea rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </Field>
      </div>
    </Page>
  );
}
