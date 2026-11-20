import type { Block, ChordStyle, Line, LineStyle, SongDoc } from '@cifrasync/core';
import type { CSSProperties } from 'react';

import { pairChunks, tokenLabel, type Part } from '../lib/chunks';

export interface SongViewOptions {
  showChords?: boolean;
  hidePersonalNotes?: boolean;
  uppercase?: boolean;
  center?: boolean;
  chorusStyle?: 'marker' | 'background' | 'marker+background';
  chordStyle?: ChordStyle;
}

function Lyric({ parts }: { parts: Part[] }) {
  return (
    <>
      {parts.map((p, i) =>
        p.voice2 ? (
          <span key={i} className="song-voice2">
            {p.text}
          </span>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

function LineView({ line, opts }: { line: Line; opts: Required<SongViewOptions> }) {
  switch (line.kind) {
    case 'blank':
      return <div className="song-blank" aria-hidden />;
    case 'lyric':
      return (
        <div className="song-line">
          <Lyric parts={line.lyric} />
        </div>
      );
    case 'chords':
      if (!opts.showChords) return null;
      return (
        <div className="song-chordline">
          {line.chords.map((t, i) => (
            <span key={i} className={t.chord ? 'song-chord' : 'song-chordlabel'}>
              {tokenLabel(t, opts.chordStyle)}
            </span>
          ))}
        </div>
      );
    case 'pair': {
      if (!opts.showChords)
        return (
          <div className="song-line">
            <Lyric parts={line.lyric} />
          </div>
        );
      return (
        <div className="song-line song-pair">
          {pairChunks(line.chords, line.lyric, opts.chordStyle).map((c, i) => (
            <span key={i} className="song-chunk">
              <span className="song-chord">{c.chord ?? ' '}</span>
              <span className="song-lyric">
                <Lyric parts={c.parts} />
              </span>
            </span>
          ))}
        </div>
      );
    }
  }
}

const STYLE_CLASS: Record<LineStyle, string> = {
  normal: '',
  chorus1: 'song-chorus song-chorus1',
  chorus2: 'song-chorus song-chorus2',
  chorus3: 'song-chorus song-chorus3',
  voice2: 'song-voice2-block',
  note: 'song-note',
};

function BlockView({ block, opts }: { block: Block; opts: Required<SongViewOptions> }) {
  switch (block.kind) {
    case 'section':
      return <div className="song-section">{block.title}</div>;
    case 'comment':
      if (block.personal && opts.hidePersonalNotes) return null;
      return <div className="song-note">{block.text}</div>;
    case 'tab':
      return (
        <div className="song-tab">
          {block.title && <div className="song-section">{block.title}</div>}
          <pre>{block.raw.join('\n')}</pre>
        </div>
      );
    case 'lines': {
      const cls = [
        STYLE_CLASS[block.style],
        block.style.startsWith('chorus') && opts.chorusStyle !== 'background' ? 'song-marker' : '',
        block.style.startsWith('chorus') && opts.chorusStyle !== 'marker' ? 'song-tint' : '',
      ].join(' ');
      return (
        <div className={cls}>
          {block.lines.map((l, i) => (
            <LineView key={i} line={l} opts={opts} />
          ))}
        </div>
      );
    }
  }
}

/** Exibe a música a partir do AST (cores via variáveis CSS --song-*). */
export function SongView({
  doc,
  options = {},
  style,
  className = '',
}: {
  doc: SongDoc;
  options?: SongViewOptions;
  style?: CSSProperties;
  className?: string;
}) {
  const opts: Required<SongViewOptions> = {
    showChords: true,
    hidePersonalNotes: false,
    uppercase: false,
    center: false,
    chorusStyle: 'marker+background',
    chordStyle: 'original',
    ...options,
  };
  return (
    <div
      className={`song ${opts.uppercase ? 'uppercase' : ''} ${opts.center ? 'song-center' : ''} ${className}`}
      style={style}
    >
      {doc.blocks.map((b, i) => (
        <BlockView key={i} block={b} opts={opts} />
      ))}
    </div>
  );
}
