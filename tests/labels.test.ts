import { describe, expect, it } from "vitest";
import {
  BoxGeometry,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Raycaster,
  Vector3,
} from "three";
import { placeLabels } from "../src/lib/label-layout";
import { surfacePointVisible } from "../src/lib/label-visibility";

describe("3D label readability", () => {
  it("separates dense labels, keeps active anchor first and stays inside the view", () => {
    const labels = placeLabels(
      Array.from({ length: 24 }, (_, i) => ({
        id: String(i),
        x: 160 + (i % 3),
        y: 140 + (i % 4),
        active: i === 17,
      })),
      360,
      300,
    );
    expect(labels.length).toBeGreaterThan(12);
    expect(labels[0].id).toBe("17");
    for (let i = 0; i < labels.length; i++) {
      expect(labels[i].x).toBeGreaterThanOrEqual(17);
      expect(labels[i].y).toBeLessThanOrEqual(283);
      for (let j = i + 1; j < labels.length; j++)
        expect(
          Math.hypot(labels[i].x - labels[j].x, labels[i].y - labels[j].y),
        ).toBeGreaterThanOrEqual(28 - 1e-7);
    }
    expect(labels.some((label) => label.x !== label.anchorX)).toBe(true);
  });
  it("hides the far surface and points behind another real object", () => {
    const camera = new PerspectiveCamera();
    camera.position.set(0, 0, 5);
    camera.updateMatrixWorld();
    const box = new Mesh(
      new BoxGeometry(2, 2, 2),
      new MeshBasicMaterial({ side: DoubleSide }),
    );
    box.updateMatrixWorld();
    const ray = new Raycaster();
    expect(
      surfacePointVisible(
        new Vector3(0, 0, 1),
        new Vector3(0, 0, 1),
        camera,
        [box],
        ray,
      ),
    ).toBe(true);
    expect(
      surfacePointVisible(
        new Vector3(0, 0, -1),
        new Vector3(0, 0, -1),
        camera,
        [box],
        ray,
      ),
    ).toBe(false);
    const blocker = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial());
    blocker.position.z = 2.5;
    blocker.updateMatrixWorld();
    expect(
      surfacePointVisible(
        new Vector3(0, 0, 1),
        new Vector3(0, 0, 1),
        camera,
        [box, blocker],
        ray,
      ),
    ).toBe(false);
    box.geometry.dispose();
    box.material.dispose();
    blocker.geometry.dispose();
    blocker.material.dispose();
  });
});
