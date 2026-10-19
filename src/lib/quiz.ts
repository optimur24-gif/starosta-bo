import { bones, type Bone } from "../data/anatomy";

export type Question = {
  id: string;
  kind: "term" | "bone";
  prompt: string;
  context: string;
  answer: string;
  options: string[];
  explanation: string;
  boneId: string;
  sourceIds: string[];
};
export type QuizConfig = {
  scope: string;
  mode: "mixed" | "terms" | "bones";
  count: number;
};

export function shuffle<T>(
  items: readonly T[],
  random: () => number = Math.random,
): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function choices(answer: string, candidates: string[], random: () => number) {
  return shuffle(
    [
      answer,
      ...shuffle(
        [...new Set(candidates)].filter((x) => x !== answer),
        random,
      ).slice(0, 3),
    ],
    random,
  );
}
export function questionPool(
  config: QuizConfig,
  random = Math.random,
): Question[] {
  const selected = bones.filter(
    (b) =>
      config.scope === "all" ||
      config.scope === b.department ||
      config.scope === b.id,
  );
  const terms = bones.flatMap((b) => b.structures.map((s) => s.latin));
  const pool: Question[] = [];
  for (const b of selected) {
    if (config.mode !== "bones") {
      for (const s of b.structures) {
        pool.push({
          id: `term:${s.id}`,
          kind: "term",
          prompt: `Как по-латыни называется «${s.name.toLocaleLowerCase("ru")}»?`,
          context: `${b.name} · ${s.category}`,
          answer: s.latin,
          options: choices(s.latin, terms, random),
          explanation: `${s.name} — ${s.latin}. ${s.note}`,
          boneId: b.id,
          sourceIds: b.sources,
        });
      }
    }
    if (config.mode !== "terms")
      pool.push({
        id: `bone:${b.id}`,
        kind: "bone",
        prompt: "Какая кость соответствует описанию?",
        context: b.summary,
        answer: b.name,
        options: choices(
          b.name,
          bones.map((x) => x.name),
          random,
        ),
        explanation: `${b.name} (${b.latin}). ${b.summary}`,
        boneId: b.id,
        sourceIds: b.sources,
      });
  }
  return pool;
}
export function createQuiz(
  config: QuizConfig,
  random = Math.random,
): Question[] {
  const pool = questionPool(config, random);
  if (config.mode === "mixed") {
    const boneQs = shuffle(
      pool.filter((x) => x.kind === "bone"),
      random,
    ).slice(0, Math.ceil(config.count / 3));
    const termQs = shuffle(
      pool.filter((x) => x.kind === "term"),
      random,
    ).slice(0, config.count - boneQs.length);
    return shuffle([...boneQs, ...termQs], random);
  }
  return shuffle(pool, random).slice(0, config.count);
}
export function makeMistakeQuiz(
  ids: string[],
  random = Math.random,
): Question[] {
  const needed = new Set(ids);
  return shuffle(
    questionPool({ scope: "all", mode: "mixed", count: 20 }, random).filter(
      (q) => needed.has(q.id),
    ),
    random,
  ).slice(0, 20);
}
export function scopeLabel(scope: string, allBones: Bone[] = bones) {
  if (scope === "all") return "Весь череп";
  if (scope === "cranial") return "Мозговой отдел";
  if (scope === "facial") return "Лицевой отдел";
  return allBones.find((x) => x.id === scope)?.name ?? "Весь череп";
}
