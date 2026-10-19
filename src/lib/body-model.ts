import { gunzipSync } from "fflate";

export type BodyKind =
  "bone" | "muscle" | "ligament" | "joint" | "tooth" | "connective" | "zone";
export type BodyZone = "articular" | "muscle" | "ligament";
export type BodyRegion =
  | "head"
  | "neck"
  | "thorax"
  | "abdomen"
  | "pelvis"
  | "upper-left"
  | "upper-right"
  | "lower-left"
  | "lower-right";
export type BodyPart = {
  id: string;
  sourceName: string;
  name: string;
  latin: string | null;
  ta2: string | null;
  kind: BodyKind;
  region: BodyRegion;
  side: "left" | "right" | null;
  pack: string;
  positions: number;
  normals: number;
  indices: number;
  vertexCount: number;
  indexCount: number;
  bounds: [[number, number, number], [number, number, number]];
  zone: BodyZone | null;
  parent: string | null;
};
export type BodyLandmark = {
  id: string;
  parent: string;
  name: string;
  latin: string | null;
  ta2: string | null;
  position: [number, number, number];
  normal: [number, number, number];
  sourceObject: string;
  projectionMm: number;
};
export type BodyManifest = {
  version: number;
  source: string;
  license: string;
  sourceRevision: string;
  counts: Record<string, number>;
  zoneCounts: Record<string, number>;
  parts: BodyPart[];
  landmarks: BodyLandmark[];
  packs: {
    file: string;
    bytes: number;
    rawBytes: number;
    sha256: string;
    rawSha256: string;
  }[];
};
export type LandmarkGroup =
  "all" | "parts" | "processes" | "openings" | "lines" | "surfaces";
export const landmarkGroups: { id: LandmarkGroup; name: string }[] = [
  { id: "all", name: "Все ориентиры" },
  { id: "parts", name: "Тело и части" },
  { id: "processes", name: "Отростки и бугры" },
  { id: "openings", name: "Отверстия и каналы" },
  { id: "lines", name: "Линии и гребни" },
  { id: "surfaces", name: "Поверхности и ямки" },
];
export function landmarkGroup(name: string): LandmarkGroup {
  if (
    /foramen|canal|fissure|meatus|aperture|отверст|канал|щел|апертур|проход/i.test(
      name,
    )
  )
    return "openings";
  if (/line|crest|border|margin|линия|линии|греб|край|края/i.test(name))
    return "lines";
  if (
    /process|tuberc|trochant|epicondyl|spine|отрост|буг|(?:^|\s)ость(?:$|\s)|остист/i.test(
      name,
    )
  )
    return "processes";
  if (/body|shaft|head|neck|part|тело|част|головк|шейк|корпус/i.test(name))
    return "parts";
  return "surfaces";
}
export const bodyRegions: { id: BodyRegion | "all"; name: string }[] = [
  { id: "all", name: "Всё тело" },
  { id: "head", name: "Голова" },
  { id: "neck", name: "Шея" },
  { id: "thorax", name: "Грудная клетка и спина" },
  { id: "abdomen", name: "Живот и поясница" },
  { id: "pelvis", name: "Таз" },
  { id: "upper-left", name: "Левая верхняя конечность" },
  { id: "upper-right", name: "Правая верхняя конечность" },
  { id: "lower-left", name: "Левая нижняя конечность" },
  { id: "lower-right", name: "Правая нижняя конечность" },
];
export const zoneNames: Record<BodyZone, string> = {
  articular: "Суставные поверхности",
  muscle: "Прикрепления мышц",
  ligament: "Прикрепления связок",
};
export type BodyOptions = {
  concealNames?: boolean;
  selectedId: string | null;
  isolated: boolean;
  kinds: BodyKind[];
  region: BodyRegion | "all";
  zones: BodyZone[];
  rotate: boolean;
  explode: number;
  labels: boolean;
  landmarkGroup: LandmarkGroup;
  selectedLandmark: string | null;
};
export const defaultBodyOptions: BodyOptions = {
  selectedId: null,
  isolated: false,
  kinds: ["bone", "tooth"],
  region: "all",
  zones: [],
  rotate: false,
  explode: 0,
  labels: true,
  landmarkGroup: "all",
  selectedLandmark: null,
};
let manifestPromise: Promise<BodyManifest> | undefined;
const packPromises = new Map<string, Promise<ArrayBuffer>>();
const base = () => `${import.meta.env.BASE_URL}models/body/`;
export function loadBodyManifest(): Promise<BodyManifest> {
  return (manifestPromise ||= fetch(`${base()}manifest.json`)
    .then(async (response) => {
      if (!response.ok)
        throw new Error(
          "Не удалось загрузить каталог анатомии. Повторите попытку.",
        );
      return response.json() as Promise<BodyManifest>;
    })
    .catch((error) => {
      manifestPromise = undefined;
      throw error;
    }));
}
export function loadBodyPack(
  file: string,
  manifest: BodyManifest,
): Promise<ArrayBuffer> {
  const existing = packPromises.get(file);
  if (existing) return existing;
  const promise = (async () => {
    const metadata = manifest.packs.find((pack) => pack.file === file);
    if (!metadata)
      throw new Error("Часть анатомической модели отсутствует в каталоге.");
    const response = await fetch(`${base()}${file}`);
    if (!response.ok)
      throw new Error(
        "Не удалось загрузить 3D-модель. Проверьте соединение и повторите.",
      );
    const compressed = await response.arrayBuffer();
    if (compressed.byteLength !== metadata.bytes)
      throw new Error("Файл модели загружен не полностью. Повторите попытку.");
    if (globalThis.crypto?.subtle) {
      const digest = await crypto.subtle.digest("SHA-256", compressed);
      const hex = Array.from(new Uint8Array(digest), (n) =>
        n.toString(16).padStart(2, "0"),
      ).join("");
      if (hex !== metadata.sha256)
        throw new Error("Проверка целостности модели не пройдена.");
    }
    let binary: ArrayBuffer;
    if (typeof DecompressionStream !== "undefined")
      binary = await new Response(
        new Blob([compressed])
          .stream()
          .pipeThrough(new DecompressionStream("gzip")),
      ).arrayBuffer();
    else
      binary = gunzipSync(new Uint8Array(compressed)).slice()
        .buffer as ArrayBuffer;
    if (binary.byteLength !== metadata.rawBytes)
      throw new Error("Повреждена упаковка анатомической модели.");
    return binary;
  })().catch((error) => {
    packPromises.delete(file);
    throw error;
  });
  packPromises.set(file, promise);
  return promise;
}
export function partVisible(part: BodyPart, options: BodyOptions): boolean {
  if (part.kind === "zone")
    return (
      options.isolated &&
      part.parent === options.selectedId &&
      !!part.zone &&
      options.zones.includes(part.zone)
    );
  if (options.isolated) return part.id === options.selectedId;
  return (
    options.kinds.includes(part.kind) &&
    (options.region === "all" || part.region === options.region)
  );
}
export const skullSourceNames: Record<string, string> = {
  frontal: "Frontal bone",
  parietal: "Parietal bone",
  temporal: "Temporal bone",
  occipital: "Occipital bone",
  sphenoid: "Sphenoid bone",
  ethmoid: "Ethmoid bone",
  maxilla: "Maxilla",
  mandible: "Mandible",
  zygomatic: "Zygomatic bone",
  nasal: "Nasal bone",
  lacrimal: "Lacrimal bone",
  palatine: "Palatine bone",
  vomer: "Vomer",
  concha: "Inferior nasal concha bone",
};
