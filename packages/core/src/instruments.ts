/**
 * Instrumentos de corda e afinações usados nos diagramas de acordes.
 * Afinações são dados: incluir outra afinação é só acrescentar uma entrada.
 */

export type InstrumentId = 'violao' | 'cavaco' | 'ukulele';

export interface Instrument {
  id: InstrumentId;
  name: string;
  /** Notas MIDI das cordas soltas, da corda mais grave (esquerda no diagrama destro) à mais aguda. */
  tuning: number[];
  /** Nomes das cordas soltas, na mesma ordem. */
  stringNames: string[];
  /** Se a nota mais grave do acorde precisa ser a fundamental (ou o baixo indicado). */
  bassMatters: boolean;
  /** Mínimo de cordas soando numa posição válida. */
  minStrings: number;
  /** Casas exibidas no diagrama. */
  fretsShown: number;
}

export const INSTRUMENTS: Record<InstrumentId, Instrument> = {
  violao: {
    id: 'violao',
    name: 'Violão / guitarra',
    tuning: [40, 45, 50, 55, 59, 64], // E2 A2 D3 G3 B3 E4
    stringNames: ['E', 'A', 'D', 'G', 'B', 'E'],
    bassMatters: true,
    minStrings: 4,
    fretsShown: 5,
  },
  cavaco: {
    id: 'cavaco',
    name: 'Cavaco / banjo',
    tuning: [62, 67, 71, 74], // D4 G4 B4 D5
    stringNames: ['D', 'G', 'B', 'D'],
    bassMatters: false,
    minStrings: 3,
    fretsShown: 5,
  },
  ukulele: {
    id: 'ukulele',
    name: 'Ukulele',
    tuning: [67, 60, 64, 69], // G4 C4 E4 A4 (G reentrante)
    stringNames: ['G', 'C', 'E', 'A'],
    bassMatters: false,
    minStrings: 3,
    fretsShown: 5,
  },
};

export function getInstrument(id: InstrumentId): Instrument {
  return INSTRUMENTS[id];
}
