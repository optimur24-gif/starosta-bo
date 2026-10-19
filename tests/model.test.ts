import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { bones } from "../src/data/anatomy";
import {
  explodeDirection,
  partName,
  type ModelManifest,
} from "../src/lib/model";

const root = resolve(process.cwd(), "public/models");
const manifest: ModelManifest = JSON.parse(
  readFileSync(resolve(root, "skull.json"), "utf8"),
);
const raw = readFileSync(resolve(root, "skull.bin"));
const buffer = raw.buffer.slice(
  raw.byteOffset,
  raw.byteOffset + raw.byteLength,
);
const provenance = JSON.parse(
  readFileSync(resolve(root, "provenance.json"), "utf8"),
);
const landmarks = JSON.parse(
  readFileSync(resolve(root, "landmarks.json"), "utf8"),
);

describe("real anatomical 3D assets", () => {
  it("contains all 22 separate skull bones with correct left/right pairing", () => {
    const parts = manifest.parts.filter((p) => p.group === "bone");
    expect(parts).toHaveLength(22);
    expect(manifest.parts.filter((p) => p.group === "teeth")).toHaveLength(28);
    for (const bone of bones) {
      const instances = parts.filter((p) => p.boneId === bone.id);
      expect(instances).toHaveLength(bone.paired ? 2 : 1);
      if (bone.paired)
        expect(instances.map((p) => p.side).sort()).toEqual(["left", "right"]);
      for (const p of instances) {
        expect(p.conceptId).toMatch(/^FMA\d+$/);
        expect(partName(p)).toContain(bone.name);
      }
    }
  });
  it("retains licensed source geometry with verified binary and source file hashes", () => {
    expect(createHash("sha256").update(raw).digest("hex")).toBe(
      provenance.binarySha256,
    );
    expect(provenance.source).toContain("BodyParts3D");
    expect(manifest.parts).toHaveLength(provenance.sourceFiles.length);
    for (let i = 0; i < manifest.parts.length; i++) {
      const p = manifest.parts[i],
        source = provenance.sourceFiles[i];
      const bytes = raw.subarray(p.positions, p.positions + source.bytes);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        source.sha256,
      );
      expect(
        createHash("sha1")
          .update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes]))
          .digest("hex"),
      ).toBe(source.gitBlob);
    }
  });
  it("decodes finite source vertices, valid normals and complete triangles", () => {
    let triangles = 0;
    for (const p of manifest.parts) {
      expect(p.indexCount % 3).toBe(0);
      const positions = new Float32Array(
        buffer,
        p.positions,
        p.vertexCount * 3,
      );
      const indices = new Uint32Array(buffer, p.indices, p.indexCount);
      expect([...positions].every(Number.isFinite)).toBe(true);
      expect([...indices].every((index) => index < p.vertexCount)).toBe(true);
      const normals = new Int16Array(buffer, p.normals, p.vertexCount * 3);
      expect([...normals].some((value) => Math.abs(value) > 0)).toBe(true);
      triangles += p.indexCount / 3;
    }
    expect(triangles).toBe(166838);
  });
  it("moves paired bones in opposite directions during pedagogical disassembly", () => {
    for (const bone of bones.filter((b) => b.paired)) {
      const parts = manifest.parts.filter((p) => p.boneId === bone.id);
      const left = explodeDirection(parts.find((p) => p.side === "left")!);
      const right = explodeDirection(parts.find((p) => p.side === "right")!);
      expect(left[0]).toBeGreaterThan(0);
      expect(right[0]).toBe(-left[0]);
      expect(left.slice(1)).toEqual(right.slice(1));
    }
  });
  it("preserves source attribution and accounts for both mapped and unmapped landmarks", () => {
    const ids = bones.flatMap((b) => b.structures.map((s) => s.id));
    const covered = new Set<string>(
      landmarks.markers.map((m: { structureId: string }) => m.structureId),
    );
    expect(covered.size).toBe(92);
    expect(landmarks.coveredStructureCount).toBe(covered.size);
    expect(new Set([...covered, ...landmarks.unmappedStructureIds])).toEqual(
      new Set(ids),
    );
    expect(
      landmarks.unmappedStructureIds.some((id: string) => covered.has(id)),
    ).toBe(false);
    expect(landmarks.license).toBe("CC BY-SA 4.0");
    expect(landmarks.registration.p95VertexDistanceMm).toBeLessThan(8);
    const expectedHash = readFileSync(
      resolve(root, "landmarks.sha256"),
      "utf8",
    ).split(" ")[0];
    expect(
      createHash("sha256")
        .update(readFileSync(resolve(root, "landmarks.json")))
        .digest("hex"),
    ).toBe(expectedHash);
  });
  it("anchors each transferred point to a real source vertex of the correct bone", () => {
    for (const marker of landmarks.markers) {
      const part = manifest.parts.find((p) => p.id === marker.partId)!;
      expect(part.boneId).toBe(marker.boneId);
      expect(
        bones
          .find((b) => b.id === marker.boneId)
          ?.structures.some((s) => s.id === marker.structureId),
      ).toBe(true);
      expect(marker.vertexIndex).toBeLessThan(part.vertexCount);
      const positions = new Float32Array(
        buffer,
        part.positions,
        part.vertexCount * 3,
      );
      for (let axis = 0; axis < 3; axis++)
        expect(marker.position[axis]).toBeCloseTo(
          positions[marker.vertexIndex * 3 + axis],
          7,
        );
      expect(marker.surfaceProjectionMm).toBeLessThan(8);
      expect(marker.sourceObject).toMatch(/\.j/);
    }
  });
});
