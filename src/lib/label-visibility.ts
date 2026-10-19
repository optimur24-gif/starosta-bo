import { Camera, Object3D, Raycaster, Vector3 } from "three";

const direction = new Vector3();
const view = new Vector3();

/** Reject the back surface and any surface obscured by real visible geometry. */
export function surfacePointVisible(
  point: Vector3,
  normal: Vector3,
  camera: Camera,
  occluders: Object3D[],
  raycaster: Raycaster,
  tolerance = 0.0008,
): boolean {
  view.copy(camera.position).sub(point);
  if (normal.lengthSq() > 0.01 && normal.dot(view) <= 0) return false;
  const distance = view.length();
  if (distance <= tolerance) return false;
  direction.copy(point).sub(camera.position).normalize();
  raycaster.set(camera.position, direction);
  raycaster.near = 0;
  raycaster.far = Math.max(0, distance - tolerance);
  return raycaster.intersectObjects(occluders, false).length === 0;
}
