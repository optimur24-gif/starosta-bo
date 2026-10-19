import { describe, expect, it } from "vitest";
import { createQuiz, makeMistakeQuiz, questionPool } from "../src/lib/quiz";
import { bones } from "../src/data/anatomy";

describe("quiz generation", () => {
  it("provides four distinct choices with exactly one answer and a sourced explanation", () => {
    const pool = questionPool({ scope: "all", mode: "mixed", count: 20 });
    expect(pool.length).toBeGreaterThan(200);
    expect(new Set(pool.map((q) => q.id)).size).toBe(pool.length);
    for (const q of pool) {
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.options.filter((x) => x === q.answer)).toHaveLength(1);
      expect(q.explanation).toContain(q.answer);
      expect(q.sourceIds.length).toBeGreaterThan(0);
    }
  });
  it("respects a single bone, department, count and question type", () => {
    const qs = createQuiz({ scope: "sphenoid", mode: "terms", count: 10 });
    expect(qs).toHaveLength(10);
    expect(qs.every((q) => q.kind === "term" && q.boneId === "sphenoid")).toBe(
      true,
    );
    const cranial = new Set(
      bones.filter((b) => b.department === "cranial").map((b) => b.id),
    );
    expect(
      createQuiz({ scope: "cranial", mode: "mixed", count: 20 }).every((q) =>
        cranial.has(q.boneId),
      ),
    ).toBe(true);
  });
  it("balances descriptions and terminology without repeating questions", () => {
    const qs = createQuiz({ scope: "all", mode: "mixed", count: 10 });
    expect(qs).toHaveLength(10);
    expect(qs.filter((q) => q.kind === "bone")).toHaveLength(4);
    expect(new Set(qs.map((q) => q.id)).size).toBe(qs.length);
  });
  it("does not fabricate extra questions for a small scope", () => {
    expect(
      createQuiz({ scope: "vomer", mode: "terms", count: 20 }),
    ).toHaveLength(2);
    expect(
      createQuiz({ scope: "vomer", mode: "bones", count: 20 }),
    ).toHaveLength(1);
  });
  it("reconstructs only requested mistakes and ignores obsolete ids", () => {
    const ids = ["term:sphenoid-12", "bone:mandible"];
    expect(
      makeMistakeQuiz([...ids, "obsolete"])
        .map((q) => q.id)
        .sort(),
    ).toEqual(ids.sort());
  });
});
