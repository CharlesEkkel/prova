// PROTOTYPE: throwaway mock data. Vocabulary follows CONTEXT.md.
export type VoicePart = 'Soprano' | 'Alto' | 'Tenor' | 'Bass';
export const VOICE_PARTS: VoicePart[] = ['Soprano', 'Alto', 'Tenor', 'Bass'];

export type TrackKind = 'part-only' | 'part-predominant' | 'combined';
export type Track = { id: string; pieceId: string; kind: TrackKind; part?: VoicePart; durationSec: number };
export type Score = { id: string; label: string; choir: boolean; file: string };
export type Piece = { id: string; title: string; composer: string; tracks: Track[]; scores: Score[] };
/** `major`: a Performance the choir wants highlighted and always easy to reach (new concept, prototyping how) */
export type Performance = { id: string; title: string; date: string; venue: string; pieceIds: string[]; major?: boolean };

/** every Score points at the same real PDF for the prototype (gitignored, copy yours to static/scores/sample.pdf) */
const PDF = '/scores/sample.pdf';

const t = (pieceId: string, kind: TrackKind, part: VoicePart | undefined, durationSec: number): Track => ({
  id: `${pieceId}-${part ?? 'all'}-${kind}`,
  pieceId,
  kind,
  part,
  durationSec
});
const allParts = (pieceId: string, kind: TrackKind, d: number) => VOICE_PARTS.map((p) => t(pieceId, kind, p, d));

export const PIECES: Piece[] = [
  {
    id: 'p1',
    title: 'Ubi Caritas',
    composer: 'Maurice Duruflé',
    tracks: [...allParts('p1', 'part-predominant', 168), t('p1', 'combined', undefined, 168)],
    scores: [
      { id: 's1', label: 'Choir score (SATB)', choir: true, file: PDF },
      { id: 's2', label: 'Organ reduction', choir: false, file: PDF }
    ]
  },
  {
    id: 'p2',
    title: 'Zadok the Priest',
    composer: 'G. F. Handel',
    tracks: [...allParts('p2', 'part-only', 312), t('p2', 'combined', undefined, 312)],
    scores: [
      { id: 's3', label: 'Choir score', choir: true, file: PDF },
      { id: 's4', label: 'Orchestral score', choir: false, file: PDF },
      { id: 's5', label: 'Piano reduction', choir: false, file: PDF }
    ]
  },
  {
    id: 'p3',
    title: 'Bring Me Little Water, Silvy',
    composer: 'Leadbelly, arr. Gilbert',
    tracks: [...allParts('p3', 'part-only', 141), t('p3', 'combined', undefined, 141)],
    scores: [{ id: 's6', label: 'Choir score', choir: true, file: PDF }]
  },
  { id: 'p4', title: 'Sicut Cervus', composer: 'G. P. da Palestrina', tracks: [], scores: [] },
  {
    id: 'p5',
    title: 'Hallelujah',
    composer: 'Leonard Cohen, arr. Roberts',
    tracks: [t('p5', 'combined', undefined, 255)],
    scores: [{ id: 's7', label: 'Choir score', choir: true, file: PDF }]
  },
  {
    id: 'p6',
    title: 'The Parting Glass',
    composer: 'Trad., arr. Ross',
    tracks: [...allParts('p6', 'part-predominant', 150), t('p6', 'combined', undefined, 150)],
    scores: [{ id: 's8', label: 'Choir score', choir: true, file: PDF }]
  }
];

export const PERFORMANCES: Performance[] = [
  { id: 'w1', title: 'Winter Concert', date: '2026-12-12', venue: "St Mark's Church", pieceIds: ['p1', 'p2', 'p3', 'p4', 'p5'] },
  { id: 'w2', title: 'Carols by Candlelight', date: '2026-12-19', venue: 'Town Hall', pieceIds: ['p5', 'p2'] },
  { id: 'w3', title: 'Annual Gala', date: '2027-03-20', venue: 'Concert Hall', pieceIds: ['p6', 'p1', 'p3', 'p2'], major: true },
  { id: 'w0', title: 'Spring Gala', date: '2026-04-18', venue: 'Civic Theatre', pieceIds: ['p6', 'p1'] }
];

export const TODAY = '2026-10-06';
export const SINGER = { name: 'Sam', part: 'Alto' as VoicePart };
/** Part Overrides: private per-Piece choice (here: Sam covers the Tenor line in Silvy). */
export const OVERRIDES = $state<Record<string, VoicePart>>({ p3: 'Tenor' });
/** per-playback "just play the Combined Track" choice (not saved like a Part Override) */
export const FORCE_COMBINED = $state<Record<string, boolean>>({});

// ---- pure helpers (core) ----
export const piece = (id: string): Piece => PIECES.find((p) => p.id === id)!;
export const performance = (id: string): Performance => PERFORMANCES.find((p) => p.id === id)!;
export const partFor = (pieceId: string): VoicePart => OVERRIDES[pieceId] ?? SINGER.part;
export const isOverridden = (pieceId: string) => pieceId in OVERRIDES;
export const combinedOf = (p: Piece): Track | undefined => p.tracks.find((x) => x.kind === 'combined');
export const partTracksOf = (p: Piece, part: VoicePart): Track[] => p.tracks.filter((x) => x.part === part);
export const upcoming = () => PERFORMANCES.filter((x) => x.date >= TODAY).toSorted((a, b) => a.date.localeCompare(b.date));
export const past = () => PERFORMANCES.filter((x) => x.date < TODAY).toSorted((a, b) => b.date.localeCompare(a.date));
export const majorPerformance = () => upcoming().find((x) => x.major);
export const performancesOf = (pieceId: string) => PERFORMANCES.filter((x) => x.pieceIds.includes(pieceId));

export function resolveTrack(p: Piece, preferCombined: boolean): Track | null {
  const combined = combinedOf(p);
  if ((preferCombined || FORCE_COMBINED[p.id]) && combined) return combined;
  return partTracksOf(p, partFor(p.id))[0] ?? combined ?? null;
}

export const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
export const fmtDate = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
export const daysUntil = (d: string) =>
  Math.round((new Date(d).getTime() - new Date(TODAY).getTime()) / 86_400_000);
export const kindLabel = (k: Track): string =>
  k.kind === 'combined' ? 'All parts' : k.kind === 'part-only' ? `${k.part} only` : `${k.part} + mix`;
