import { getBone } from "../data/anatomy";

export type ModelPart = {
  id: string;
  boneId: string | null;
  name: string;
  side: "left" | "right" | null;
  conceptId: string;
  group: "bone" | "teeth";
  jaw: "upper" | "lower" | null;
  positions: number;
  normals: number;
  indices: number;
  vertexCount: number;
  indexCount: number;
  bounds: [[number, number, number], [number, number, number]];
};
export type ModelManifest = {
  version: number;
  source: string;
  binary: string;
  boneCount: number;
  teethCount: number;
  parts: ModelPart[];
};
export type ModelLandmark = {
  structureId: string;
  partId: string;
  boneId: string;
  vertexIndex: number;
  position: [number, number, number];
  sourceObject: string;
  surfaceProjectionMm: number;
};
export type ModelLandmarks = {
  version: number;
  coveredStructureCount: number;
  markers: ModelLandmark[];
  unmappedStructureIds: string[];
};
export type ModelOptions = {
  selectedId: string | null;
  isolated: boolean;
  explode: number;
  rotate: boolean;
  labels: boolean;
  colored: boolean;
  teeth: boolean;
  department: "all" | "cranial" | "facial";
  structureId?: string | null;
};
export type CameraPreset = "front" | "left" | "back" | "base" | "top";
export const defaultModelOptions: ModelOptions = {
  selectedId: null,
  isolated: false,
  explode: 0,
  rotate: false,
  labels: false,
  colored: true,
  teeth: true,
  department: "all",
};

export function partName(part: ModelPart) {
  const b = part.boneId ? getBone(part.boneId) : undefined;
  return b
    ? `${b.name}${part.side ? ` · ${part.side === "left" ? "левая" : "правая"}` : ""}`
    : part.name;
}
export function explodeDirection(part: ModelPart): [number, number, number] {
  const side = part.side === "left" ? 1 : part.side === "right" ? -1 : 0;
  const paths: Record<string, [number, number, number]> = {
    frontal: [0, 0.85, 0.55],
    parietal: [side * 0.95, 0.65, -0.25],
    temporal: [side * 1.05, -0.05, -0.15],
    occipital: [0, 0.25, -0.95],
    sphenoid: [0, -0.1, -0.2],
    ethmoid: [0, 0.28, 1.05],
    maxilla: [side * 0.65, -0.3, 0.85],
    zygomatic: [side * 1.05, -0.1, 0.65],
    nasal: [side * 0.28, 0.25, 1.45],
    lacrimal: [side * 0.62, 0.15, 1.2],
    palatine: [side * 0.45, -0.55, -0.15],
    vomer: [0, -0.5, 0.8],
    concha: [side * 0.4, -0.1, 1.12],
    mandible: [0, -1, 0.15],
  };
  if (part.group === "teeth")
    return part.jaw === "lower" ? paths.mandible : [side * 0.65, -0.3, 0.85];
  return paths[part.boneId || ""] || [0, 0, 0];
}
let cached:
  | Promise<{
      manifest: ModelManifest;
      binary: ArrayBuffer;
      landmarks: ModelLandmarks;
    }>
  | undefined;
export function loadSkullModel() {
  if (!cached)
    cached = (async () => {
      const url = `${import.meta.env.BASE_URL}models/`;
      const [metaResponse, binaryResponse, landmarkResponse] =
        await Promise.all([
          fetch(`${url}skull.json`),
          fetch(`${url}skull.bin`),
          fetch(`${url}landmarks.json`),
        ]);
      if (!metaResponse.ok || !binaryResponse.ok || !landmarkResponse.ok)
        throw new Error(
          "Не удалось загрузить модель. Проверьте подключение и путь публикации.",
        );
      const manifest: ModelManifest = await metaResponse.json();
      const binary = await binaryResponse.arrayBuffer();
      const landmarks: ModelLandmarks = await landmarkResponse.json();
      if (
        manifest.version !== 1 ||
        manifest.boneCount !== 22 ||
        manifest.parts.filter((p) => p.group === "bone").length !== 22
      )
        throw new Error("Файл модели не прошёл проверку состава.");
      return { manifest, binary, landmarks };
    })().catch((error) => {
      cached = undefined;
      throw error;
    });
  return cached;
}
