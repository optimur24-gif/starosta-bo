import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import {
  bones,
  totalBones,
  totalStructures,
  getBone,
  matchesBone,
  sourceList,
} from "../src/data/anatomy";
import { annotations } from "../src/data/annotations";

describe("anatomical catalogue", () => {
  it("accounts for the 22 adult skull bones in 14 types, with the correct 8/14 division", () => {
    expect(bones).toHaveLength(14);
    expect(totalBones).toBe(22);
    expect(
      bones
        .filter((b) => b.department === "cranial")
        .reduce((s, b) => s + (b.paired ? 2 : 1), 0),
    ).toBe(8);
    expect(
      bones
        .filter((b) => b.department === "facial")
        .reduce((s, b) => s + (b.paired ? 2 : 1), 0),
    ).toBe(14);
    expect(
      bones
        .filter((b) => b.paired)
        .map((b) => b.id)
        .sort(),
    ).toEqual(
      [
        "concha",
        "lacrimal",
        "maxilla",
        "nasal",
        "palatine",
        "parietal",
        "temporal",
        "zygomatic",
      ].sort(),
    );
  });
  it("has complete bilingual records, unique structure ids and resolvable references", () => {
    const ids = bones.flatMap((b) => b.structures.map((s) => s.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(totalStructures).toBeGreaterThan(200);
    for (const b of bones) {
      expect(b.structures.length).toBeGreaterThan(0);
      for (const s of b.structures)
        for (const value of [s.name, s.latin, s.note, s.category])
          expect(value.length).toBeGreaterThan(1);
      for (const id of b.articulations) expect(getBone(id)).toBeDefined();
      for (const id of b.sources)
        expect(sourceList.some((s) => s.id === id)).toBe(true);
    }
  });
  it("keeps the independent inferior concha separate from the ethmoid conchae", () => {
    expect(getBone("concha")?.department).toBe("facial");
    const ethmoid = getBone("ethmoid")!;
    expect(
      ethmoid.structures.some((s) => s.latin === "Concha nasalis superior"),
    ).toBe(true);
    expect(
      ethmoid.structures.some((s) => s.latin === "Concha nasalis media"),
    ).toBe(true);
    expect(
      ethmoid.structures.some((s) => s.latin === "Concha nasalis inferior"),
    ).toBe(false);
  });
  it("links visible illustration markers to real structures of the selected bone", () => {
    for (const [id, points] of Object.entries(annotations)) {
      const bone = getBone(id)!;
      for (const point of points) {
        expect(bone.structures.some((s) => s.latin === point.latin)).toBe(true);
        for (const coordinate of [
          point.x,
          point.y,
          point.labelX,
          point.labelY,
        ]) {
          expect(coordinate).toBeGreaterThanOrEqual(0);
          expect(coordinate).toBeLessThanOrEqual(100);
        }
      }
    }
  });
  it("finds structures across Russian ё/е spellings and Latin names", () => {
    expect(matchesBone(getBone("ethmoid")!, "РЕШЕТЧАТАЯ")).toBe(true);
    expect(matchesBone(getBone("sphenoid")!, "foramen ovale")).toBe(true);
    expect(matchesBone(getBone("mandible")!, "подбородочное")).toBe(true);
    expect(matchesBone(getBone("nasal")!, "foramen ovale")).toBe(false);
  });
  it("ships unchanged licensed original illustrations with matching provenance hashes", () => {
    const base = resolve(process.cwd(), "public/illustrations");
    const provenance = JSON.parse(
      readFileSync(resolve(base, "provenance.json"), "utf8"),
    );
    expect(provenance.modified).toBe(false);
    expect(provenance.license).toBe("CC BY-NC-SA 4.0");
    for (const img of provenance.images)
      expect(
        createHash("sha256")
          .update(readFileSync(resolve(base, img.file)))
          .digest("hex"),
      ).toBe(img.sha256);
    for (const b of bones)
      expect(
        provenance.images.some(
          (i: { file: string }) => i.file === b.illustration,
        ),
      ).toBe(true);
  });
});
