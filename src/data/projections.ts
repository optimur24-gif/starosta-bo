export const plates: Record<
  string,
  { label: string; title: string; isolated?: boolean }
> = {
  "anterior.jpg": { label: "Спереди", title: "Anterior View of Skull" },
  "lateral.jpg": { label: "Сбоку", title: "Lateral View of Skull" },
  "sagittal.jpg": {
    label: "Сагиттальный срез",
    title: "Sagittal Section of Skull",
  },
  "base.jpg": {
    label: "Основание черепа",
    title: "External and Internal Views of Base of Skull",
  },
  "posterior.jpg": { label: "Сзади", title: "Posterior View of Skull" },
  "nasal-cavity.jpg": {
    label: "Перегородка носа",
    title: "Bones of the Nasal Cavity",
  },
  "temporal.jpg": {
    label: "Отдельная кость",
    title: "Temporal Bone",
    isolated: true,
  },
  "sphenoid.jpg": {
    label: "Отдельная кость",
    title: "Sphenoid Bone",
    isolated: true,
  },
  "ethmoid.jpg": {
    label: "Отдельная кость",
    title: "Ethmoid Bone",
    isolated: true,
  },
  "maxilla.jpg": {
    label: "Отдельная кость",
    title: "Maxillary Bone",
    isolated: true,
  },
  "mandible.jpg": {
    label: "Отдельная кость",
    title: "Mandible",
    isolated: true,
  },
};
export const additionalProjections: Record<string, string[]> = {
  frontal: ["base.jpg", "sagittal.jpg"],
  parietal: ["posterior.jpg"],
  temporal: ["base.jpg", "sagittal.jpg"],
  occipital: ["base.jpg"],
  sphenoid: ["base.jpg", "sagittal.jpg"],
  ethmoid: ["base.jpg", "sagittal.jpg"],
  maxilla: ["anterior.jpg", "base.jpg"],
  zygomatic: ["anterior.jpg", "base.jpg"],
  nasal: ["lateral.jpg", "sagittal.jpg"],
  lacrimal: ["lateral.jpg"],
  palatine: ["nasal-cavity.jpg", "sagittal.jpg"],
  vomer: ["nasal-cavity.jpg", "anterior.jpg"],
  concha: ["anterior.jpg"],
  mandible: ["anterior.jpg", "sagittal.jpg"],
};
