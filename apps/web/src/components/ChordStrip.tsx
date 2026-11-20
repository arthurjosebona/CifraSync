import type { InstrumentId } from '@cifrasync/core';

import type { ChordShape } from '../lib/music';
import { ChordDiagram } from './ChordDiagram';

/**
 * Lista de diagramas dos acordes usados. Tocar num diagrama passa para a próxima posição.
 */
export function ChordStrip({
  shapes,
  instrument,
  lefty,
  onCycle,
  size = 76,
  direction = 'row',
}: {
  shapes: ChordShape[];
  instrument: InstrumentId;
  lefty: boolean;
  onCycle?: (name: string, nextIndex: number) => void;
  size?: number;
  direction?: 'row' | 'column';
}) {
  if (!shapes.length) return null;
  return (
    <div
      className={
        direction === 'row'
          ? 'flex gap-2 overflow-x-auto pb-1'
          : 'flex flex-col items-center gap-2 overflow-y-auto'
      }
    >
      {shapes.map((s) => {
        const v = s.voicings[s.index]!;
        const next = (s.index + 1) % s.voicings.length;
        return (
          <button
            key={s.name}
            type="button"
            onClick={() => onCycle?.(s.name, next)}
            title={`${s.name}: posição ${s.index + 1} de ${s.voicings.length}`}
            className="shrink-0 rounded-lg p-1 hover:bg-surface-2"
            style={{ color: 'var(--song-lyric)' }}
          >
            <ChordDiagram
              frets={v.frets}
              instrument={instrument}
              lefty={lefty}
              name={s.name}
              size={size}
            />
            <span className="block text-[10px] text-muted">
              {s.index + 1}/{s.voicings.length}
            </span>
          </button>
        );
      })}
    </div>
  );
}
