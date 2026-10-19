export type LabelAnchor = {
  id: string;
  x: number;
  y: number;
  active?: boolean;
  distance?: number;
};
export type PlacedLabel = LabelAnchor & { anchorX: number; anchorY: number };

/** Keep labels distinct; displaced labels retain their true anchor via a leader. */
export function placeLabels(
  anchors: LabelAnchor[],
  width: number,
  height: number,
  diameter = 22,
): PlacedLabel[] {
  const gap = diameter + 6;
  const margin = diameter / 2 + 6;
  const placed: PlacedLabel[] = [];
  const offsets: [number, number][] = [[0, 0]];
  for (const radius of [gap, gap * 1.6, gap * 2.3, gap * 3])
    for (let step = 0; step < 12; step++) {
      const angle = (step * Math.PI) / 6;
      offsets.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
    }
  const sorted = [...anchors].sort(
    (a, b) =>
      Number(!!b.active) - Number(!!a.active) ||
      (a.distance || 0) - (b.distance || 0) ||
      a.id.localeCompare(b.id),
  );
  for (const anchor of sorted) {
    for (const [dx, dy] of offsets) {
      const x = anchor.x + dx;
      const y = anchor.y + dy;
      if (x < margin || x > width - margin || y < margin || y > height - margin)
        continue;
      if (placed.some((other) => Math.hypot(x - other.x, y - other.y) < gap))
        continue;
      placed.push({ ...anchor, x, y, anchorX: anchor.x, anchorY: anchor.y });
      break;
    }
  }
  return placed;
}
