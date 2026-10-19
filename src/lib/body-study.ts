import { latinName, russianName } from "../data/body-terms";
import type { BodyPart } from "./body-model";

export type StudyDirection = "ru-la" | "la-ru" | "model-ru";
export type BodyQuestion = {
  id: string;
  part: BodyPart;
  prompt: string;
  options: { id: string; label: string }[];
  correctId: string;
};
export function shuffled<T>(values: T[]): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}
export function studyPool(parts: BodyPart[]): BodyPart[] {
  const seen = new Set<string>();
  return parts.filter((part) => {
    if (
      !["bone", "muscle", "ligament"].includes(part.kind) ||
      !russianName(part) ||
      !latinName(part)
    )
      return false;
    const key = latinName(part)!.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
export function makeBodyQuiz(
  pool: BodyPart[],
  direction: StudyDirection,
  count = 10,
): BodyQuestion[] {
  if (pool.length < 4) return [];
  return shuffled(pool)
    .slice(0, Math.min(count, pool.length))
    .map((part, index) => {
      const label = (item: BodyPart) =>
        direction === "ru-la" ? latinName(item)! : russianName(item)!;
      const used = new Set([label(part)]);
      const distractors = shuffled(pool.filter((item) => item.id !== part.id))
        .filter((item) => {
          const name = label(item);
          if (used.has(name)) return false;
          used.add(name);
          return true;
        })
        .slice(0, 3);
      const prompt =
        direction === "ru-la"
          ? `Как по-латыни: «${russianName(part)}»?`
          : direction === "la-ru"
            ? `Как по-русски: «${latinName(part)}»?`
            : "Как называется показанная анатомическая структура?";
      return {
        id: `body-${index}-${part.id}`,
        part,
        prompt,
        options: shuffled([part, ...distractors]).map((item) => ({
          id: item.id,
          label: label(item),
        })),
        correctId: part.id,
      };
    });
}
export type StudyRecord = {
  date: string;
  score: number;
  total: number;
  direction: StudyDirection;
  mistakes: string[];
};
const KEY = "cranium-body-study-v1";
export type BodyStudyProgress = {
  known: string[];
  notes: Record<string, string>;
  history: StudyRecord[];
};
export function readBodyStudy(): BodyStudyProgress {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || "null");
    return {
      known: Array.isArray(value?.known)
        ? value.known.filter((id: unknown) => typeof id === "string")
        : [],
      notes:
        value?.notes &&
        typeof value.notes === "object" &&
        !Array.isArray(value.notes)
          ? Object.fromEntries(
              Object.entries(value.notes).filter(
                (row): row is [string, string] => typeof row[1] === "string",
              ),
            )
          : {},
      history: Array.isArray(value?.history)
        ? value.history
            .filter(
              (row: StudyRecord) =>
                typeof row?.score === "number" &&
                typeof row?.total === "number" &&
                typeof row?.date === "string",
            )
            .slice(0, 30)
        : [],
    };
  } catch {
    return { known: [], notes: {}, history: [] };
  }
}
export function saveBodyStudy(value: BodyStudyProgress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
