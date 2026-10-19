import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { bodyName, latinName, russianName } from "../src/data/body-terms";
import {
  defaultBodyOptions,
  landmarkGroup,
  partVisible,
  type BodyManifest,
} from "../src/lib/body-model";
import {
  makeBodyQuiz,
  readBodyStudy,
  saveBodyStudy,
  studyPool,
} from "../src/lib/body-study";
const manifest = JSON.parse(
  readFileSync("public/models/body/manifest.json", "utf8"),
) as BodyManifest;
describe("whole-body anatomy", () => {
  it("has bilingual names for every bone, muscle and ligament used in study", () => {
    const missing = manifest.parts
      .filter(
        (part) =>
          ["bone", "muscle", "ligament"].includes(part.kind) &&
          (!russianName(part) || !latinName(part)),
      )
      .map((part) => part.name);
    expect([...new Set(missing)]).toEqual([]);
    expect(studyPool(manifest.parts).length).toBeGreaterThan(400);
  });
  it("isolates the selected bone and only its requested authored zones", () => {
    const zone = manifest.parts.find((part) => part.zone === "ligament")!;
    const selected = manifest.parts.find((part) => part.id === zone.parent)!;
    const options = {
      ...defaultBodyOptions,
      isolated: true,
      selectedId: selected.id,
      zones: ["ligament" as const],
    };
    expect(partVisible(selected, options)).toBe(true);
    expect(partVisible(zone, options)).toBe(true);
    expect(
      manifest.parts.filter(
        (part) => part.kind !== "zone" && partVisible(part, options),
      ),
    ).toHaveLength(1);
    expect(
      manifest.parts
        .filter((part) => part.zone && partVisible(part, options))
        .every(
          (part) => part.parent === selected.id && part.zone === "ligament",
        ),
    ).toBe(true);
    expect(bodyName(selected)).not.toBe("");
  });
  it("generates unambiguous questions in both language directions and real-model mode", () => {
    const pool = studyPool(manifest.parts);
    for (const direction of ["ru-la", "la-ru", "model-ru"] as const) {
      const quiz = makeBodyQuiz(pool, direction);
      expect(quiz).toHaveLength(10);
      for (const question of quiz) {
        expect(question.options).toHaveLength(4);
        expect(new Set(question.options.map((item) => item.label)).size).toBe(
          4,
        );
        expect(
          question.options.filter((item) => item.id === question.correctId),
        ).toHaveLength(1);
        expect(
          manifest.parts.find((part) => part.id === question.part.id)
            ?.vertexCount,
        ).toBeGreaterThan(0);
      }
    }
  });
  it("classifies bone structures without mistaking кость for ость", () => {
    expect(landmarkGroup("Тело клиновидной кости")).toBe("parts");
    expect(landmarkGroup("Лобная поверхность кости")).toBe("surfaces");
    expect(landmarkGroup("Носовая ость")).toBe("processes");
    expect(landmarkGroup("Optic canal")).toBe("openings");
    expect(landmarkGroup("Верхняя выйная линия")).toBe("lines");
  });
  it("persists notes, known cards and results, and recovers malformed storage", () => {
    const value = {
      known: ["z1"],
      notes: { z1: "Тело и отростки" },
      history: [
        {
          date: "2026-10-19",
          score: 7,
          total: 10,
          direction: "la-ru" as const,
          mistakes: ["z2"],
        },
      ],
    };
    expect(saveBodyStudy(value)).toBe(true);
    expect(readBodyStudy()).toEqual(value);
    localStorage.setItem("cranium-body-study-v1", "broken");
    expect(readBodyStudy().known).toEqual([]);
  });
});
