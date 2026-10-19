import { bones } from "../data/anatomy";

export const STORAGE_KEY = "cranium.progress.v1";
export type QuizResult = {
  id: string;
  date: string;
  total: number;
  correct: number;
  scope: string;
  mistakes: string[];
};
export type Progress = {
  version: 1;
  studied: string[];
  bookmarks: string[];
  history: QuizResult[];
  mistakes: string[];
};
export const emptyProgress = (): Progress => ({
  version: 1,
  studied: [],
  bookmarks: [],
  history: [],
  mistakes: [],
});
const boneIds = new Set(bones.map((b) => b.id));
const strings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((x) => typeof x === "string");
export function readProgress(): Progress {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "null",
    );
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("version" in parsed) ||
      parsed.version !== 1
    )
      return emptyProgress();
    const value = parsed as Record<string, unknown>;
    const history: QuizResult[] = Array.isArray(value.history)
      ? value.history
          .filter((item: unknown): item is QuizResult => {
            if (!item || typeof item !== "object") return false;
            const r = item as Partial<QuizResult>;
            return (
              typeof r.id === "string" &&
              typeof r.date === "string" &&
              Number.isFinite(Date.parse(r.date)) &&
              typeof r.total === "number" &&
              r.total > 0 &&
              r.total <= 1000 &&
              Number.isInteger(r.total) &&
              typeof r.correct === "number" &&
              Number.isInteger(r.correct) &&
              r.correct >= 0 &&
              r.correct <= r.total &&
              typeof r.scope === "string" &&
              strings(r.mistakes)
            );
          })
          .slice(0, 30)
      : [];
    return {
      version: 1,
      studied: strings(value.studied)
        ? [...new Set(value.studied.filter((id) => boneIds.has(id)))]
        : [],
      bookmarks: strings(value.bookmarks)
        ? [...new Set(value.bookmarks.filter((id) => boneIds.has(id)))]
        : [],
      history,
      mistakes: strings(value.mistakes)
        ? [...new Set<string>(value.mistakes)]
        : [],
    };
  } catch {
    return emptyProgress();
  }
}
export function saveProgress(value: Progress): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
export function recordResult(
  progress: Progress,
  result: QuizResult,
  answeredIds: string[],
): Progress {
  const missed = new Set(result.mistakes);
  const cleared = new Set(answeredIds.filter((id) => !missed.has(id)));
  return {
    ...progress,
    history: [result, ...progress.history].slice(0, 30),
    mistakes: [
      ...new Set([
        ...progress.mistakes.filter((id) => !cleared.has(id)),
        ...result.mistakes,
      ]),
    ],
  };
}
