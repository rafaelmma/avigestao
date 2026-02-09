export type NotesByStage = Record<number, number>;

export type ScoreDetail = {
  baseScore?: number; // 0-10
  strangeNotes?: number; // 0.25 cada
  groupedCalls?: number; // 0.25 cada
  returnCount?: number; // 0.50 cada
  rasgadaReturnCount?: number; // 0.50 cada
  remontagemCount?: number; // 1.00 cada
  startWithoutEntryCount?: number; // 0.50 cada
  omissionCount?: number; // 0.10 cada
  invalidChantCount?: number; // 0.25 cada
};

export type ScoreDetailsByStage = Record<number, ScoreDetail>;

const round2 = (value: number) => Math.round(value * 100) / 100;

export function computeStageScore(detail: ScoreDetail = {}): number {
  const base = Number(detail.baseScore || 0);
  const deductions =
    Number(detail.strangeNotes || 0) * 0.25 +
    Number(detail.groupedCalls || 0) * 0.25 +
    Number(detail.returnCount || 0) * 0.5 +
    Number(detail.rasgadaReturnCount || 0) * 0.5 +
    Number(detail.remontagemCount || 0) * 1.0 +
    Number(detail.startWithoutEntryCount || 0) * 0.5 +
    Number(detail.omissionCount || 0) * 0.1 +
    Number(detail.invalidChantCount || 0) * 0.25;
  const result = base - deductions;
  if (Number.isNaN(result)) return 0;
  return round2(Math.max(0, Math.min(10, result)));
}

export function computeTotalScore(notes: NotesByStage = {}): number {
  const values = Object.values(notes).map((v) => Number(v) || 0);
  const total = values.reduce((acc, v) => acc + v, 0);
  return round2(total);
}

export function computeNotesFromDetails(details: ScoreDetailsByStage = {}): NotesByStage {
  const notes: NotesByStage = {};
  Object.entries(details).forEach(([stageKey, detail]) => {
    const stage = Number(stageKey);
    if (!Number.isNaN(stage)) {
      notes[stage] = computeStageScore(detail);
    }
  });
  return notes;
}

export function getTieBreakValues(notes: NotesByStage = {}, numberOfStages = 1): number[] {
  const arr: number[] = [];
  for (let s = numberOfStages; s >= 1; s--) {
    arr.push(Number(notes[s] || 0));
  }
  return arr;
}

export function computeScoreSummary(notes: NotesByStage = {}, numberOfStages = 1) {
  return {
    totalScore: computeTotalScore(notes),
    tieValues: getTieBreakValues(notes, numberOfStages),
  };
}
