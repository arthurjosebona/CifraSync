import type { LineStyle } from '@cifrasync/core';
import { forwardRef } from 'react';

import type { Unit } from '../../lib/paginate';
import { LineView, type SongViewOptions } from '../SongView';

const STYLE: Record<LineStyle, string> = {
  normal: '',
  chorus1: 'song-chorus song-chorus1',
  chorus2: 'song-chorus song-chorus2',
  chorus3: 'song-chorus song-chorus3',
  voice2: 'song-voice2-block',
  note: 'song-note',
};

/** Uma unidade indivisível do palco (linha, cabeçalho, tablatura ou anotação). */
export const UnitView = forwardRef<HTMLDivElement, { unit: Unit; opts: Required<SongViewOptions> }>(
  function UnitView({ unit, opts }, ref) {
    switch (unit.kind) {
      case 'section':
        return (
          <div ref={ref} className="song-section">
            {unit.title}
          </div>
        );
      case 'comment':
        return (
          <div ref={ref} className="song-note">
            {unit.text}
          </div>
        );
      case 'tab':
        return (
          <div ref={ref} className="song-tab">
            {unit.title && <div className="song-section">{unit.title}</div>}
            <pre>{unit.raw.join('\n')}</pre>
          </div>
        );
      case 'line': {
        const chorus = unit.style.startsWith('chorus');
        const cls = [
          STYLE[unit.style],
          chorus && opts.chorusStyle !== 'background' ? 'song-marker' : '',
          chorus && opts.chorusStyle !== 'marker' ? 'song-tint' : '',
          chorus ? 'song-unit' : '',
          chorus && unit.first ? 'song-unit-first' : '',
          chorus && unit.last ? 'song-unit-last' : '',
        ].join(' ');
        return (
          <div ref={ref} className={cls}>
            <LineView line={unit.line} opts={opts} />
          </div>
        );
      }
    }
  },
);
