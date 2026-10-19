import { landmarkGroup } from "./body-model";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { getBone } from "../data/anatomy";
import { placeLabels, type LabelAnchor } from "./label-layout";
import { surfacePointVisible } from "./label-visibility";
import {
  explodeDirection,
  loadSkullModel,
  partName,
  type CameraPreset,
  type ModelManifest,
  type ModelOptions,
  type ModelPart,
} from "./model";

type BoneMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> & {
  userData: {
    part: ModelPart;
    baseColor: THREE.Color;
    direction: THREE.Vector3;
    center: THREE.Vector3;
  };
};
export type SkullScene = {
  update: (options: ModelOptions) => void;
  preset: (preset: CameraPreset) => void;
  zoom: (direction: number) => void;
  reset: () => void;
  dispose: () => void;
};
export type SceneCallbacks = {
  select: (part: ModelPart | null) => void;
  landmark: (structureId: string) => void;
  ready: (manifest: ModelManifest, coveredIds: string[]) => void;
  error: (message: string) => void;
};

export async function createSkullScene(
  host: HTMLElement,
  initial: ModelOptions,
  initialBoneId: string | undefined,
  initialSide: "left" | "right" | undefined,
  callbacks: SceneCallbacks,
  isCancelled: () => boolean,
): Promise<SkullScene | null> {
  const { manifest, binary, landmarks } = await loadSkullModel();
  if (isCancelled()) return null;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
  } catch {
    throw new Error(
      "3D требует WebGL 2. Обновите Telegram или откройте приложение в современном браузере.",
    );
  }
  const scene = new THREE.Scene();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  const canvas = renderer.domElement;
  canvas.setAttribute(
    "aria-label",
    "Интерактивная анатомическая 3D-модель черепа",
  );
  canvas.setAttribute("role", "img");
  canvas.dataset.ready = "false";
  canvas.dataset.bones = "22";
  host.appendChild(canvas);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 80);
  camera.position.set(2.5, 0.4, 4.8);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.09;
  controls.minDistance = 0.18;
  controls.maxDistance = 20;
  controls.autoRotateSpeed = 0.65;
  controls.target.set(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xfffbed, 0x6c7766, 1.8));
  const key = new THREE.DirectionalLight(0xfff5e1, 2.6);
  key.position.set(4, 7, 6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xe4edf6, 1.1);
  fill.position.set(-5, 1, 2);
  scene.add(fill);
  const backlight = new THREE.DirectionalLight(0xffffff, 1.5);
  backlight.position.set(0, 4, -6);
  scene.add(backlight);
  const allBones: BoneMesh[] = [];
  const allMeshes: BoneMesh[] = [];
  const labels: { element: HTMLButtonElement; mesh: BoneMesh }[] = [];
  const tooltip = document.createElement("div");
  tooltip.className = "model-hover-label";
  tooltip.hidden = true;
  host.appendChild(tooltip);
  const center = new THREE.Vector3(0, 1.607, -0.014);
  const scale = 10;
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  let options = { ...initial };
  const firstPart = initialBoneId
    ? manifest.parts.find(
        (p) =>
          p.boneId === initialBoneId &&
          (p.side === (initialSide || "left") || !p.side),
      )
    : undefined;
  if (firstPart) options.selectedId = firstPart.id;
  let currentExplosion = options.explode;
  let frame = 0,
    disposed = false,
    inView = true,
    lastTime = 0;
  let cameraAnimating = false;
  const goalPosition = camera.position.clone();
  const goalTarget = controls.target.clone();
  let currentPreset: CameraPreset = "front";
  let needsRender = true;
  const labelLayer = document.createElement("div");
  labelLayer.className = "model-label-layer";
  host.appendChild(labelLayer);
  const leaders = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  leaders.classList.add("model-label-leaders");
  labelLayer.appendChild(leaders);
  const landmarkLabels: {
    element: HTMLButtonElement;
    mesh: BoneMesh;
    point: THREE.Vector3;
    normal: THREE.Vector3;
    leader: SVGLineElement;
    id: string;
    group: string;
  }[] = [];

  for (const part of manifest.parts) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(
        new Float32Array(binary, part.positions, part.vertexCount * 3).slice(),
        3,
      ),
    );
    geometry.setAttribute(
      "normal",
      new THREE.BufferAttribute(
        new Int16Array(binary, part.normals, part.vertexCount * 3).slice(),
        3,
        true,
      ),
    );
    geometry.setIndex(
      new THREE.BufferAttribute(
        new Uint32Array(binary, part.indices, part.indexCount).slice(),
        1,
      ),
    );
    geometry.translate(-center.x, -center.y, -center.z);
    geometry.scale(scale, scale, scale);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const b = part.boneId ? getBone(part.boneId) : undefined;
    const color = new THREE.Color(b?.color || "#f5eddc");
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.64,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material) as BoneMesh;
    mesh.name = part.id;
    mesh.userData = {
      part,
      baseColor: color,
      direction: new THREE.Vector3(...explodeDirection(part)),
      center: geometry.boundingBox!.getCenter(new THREE.Vector3()),
    };
    scene.add(mesh);
    allMeshes.push(mesh);
    if (part.group === "bone") {
      allBones.push(mesh);
      const label = document.createElement("button");
      label.className = "model-bone-label";
      label.textContent = partName(part);
      label.setAttribute("aria-label", `Выбрать 3D: ${partName(part)}`);
      label.addEventListener("click", () => callbacks.select(part));
      labelLayer.appendChild(label);
      labels.push({ element: label, mesh });
    }
  }

  for (const marker of landmarks.markers) {
    const mesh = allBones.find((m) => m.name === marker.partId);
    const b = getBone(marker.boneId);
    const structure = b?.structures.find((s) => s.id === marker.structureId);
    if (!mesh || !structure || !b) continue;
    const element = document.createElement("button");
    element.className = "model-landmark-pin";
    element.hidden = true;
    element.textContent = String(b.structures.indexOf(structure) + 1);
    element.title = `${structure.name} · ${structure.latin}`;
    element.setAttribute("aria-label", `3D-ориентир: ${structure.name}`);
    element.addEventListener("click", () => callbacks.landmark(structure.id));
    const leader = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "line",
    );
    leader.style.display = "none";
    leaders.appendChild(leader);
    labelLayer.appendChild(element);
    landmarkLabels.push({
      element,
      mesh,
      point: new THREE.Vector3(...marker.position)
        .sub(center)
        .multiplyScalar(scale),
      normal: new THREE.Vector3()
        .fromBufferAttribute(
          mesh.geometry.getAttribute("normal"),
          marker.vertexIndex,
        )
        .normalize(),
      leader,
      id: marker.structureId,
      group: landmarkGroup(structure.name),
    });
  }

  function selectedMesh() {
    return allBones.find((mesh) => mesh.name === options.selectedId);
  }
  function applyOptions() {
    needsRender = true;
    const selected = selectedMesh();
    for (const mesh of allMeshes) {
      const part = mesh.userData.part;
      const b = part.boneId ? getBone(part.boneId) : undefined;
      mesh.visible =
        part.group === "teeth"
          ? options.teeth &&
            !options.isolated &&
            options.department !== "cranial"
          : (!options.isolated || mesh === selected) &&
            (options.department === "all" ||
              b?.department === options.department);
      mesh.material.color.copy(
        options.colored || part.group === "teeth"
          ? mesh.userData.baseColor
          : new THREE.Color("#e4d8bd"),
      );
      mesh.material.emissive.set(mesh === selected ? "#789958" : "#000000");
      mesh.material.emissiveIntensity = mesh === selected ? 0.18 : 0;
    }
    controls.autoRotate = options.rotate && !reducedMotion;
    canvas.dataset.isolated = String(options.isolated);
    canvas.dataset.selected = options.selectedId || "";
    canvas.dataset.visibleBones = String(
      allBones.filter((m) => m.visible).length,
    );
    canvas.dataset.landmark = options.structureId || "";
  }
  function boundsAtTarget() {
    const box = new THREE.Box3();
    for (const mesh of allMeshes)
      if (mesh.visible) {
        const moved = mesh.geometry.boundingBox!.clone();
        if (!options.isolated)
          moved.translate(
            mesh.userData.direction.clone().multiplyScalar(options.explode),
          );
        box.union(moved);
      }
    return box.isEmpty()
      ? new THREE.Box3(
          new THREE.Vector3(-1, -1, -1),
          new THREE.Vector3(1, 1, 1),
        )
      : box;
  }
  const directions: Record<CameraPreset, THREE.Vector3> = {
    front: new THREE.Vector3(0.2, 0.04, 1),
    left: new THREE.Vector3(1, 0.03, 0.03),
    back: new THREE.Vector3(0, 0.06, -1),
    base: new THREE.Vector3(0.04, -1, 0.07),
    top: new THREE.Vector3(0.04, 1, 0.07),
  };
  function fit(preset: CameraPreset = currentPreset, instant = false) {
    needsRender = true;
    currentPreset = preset;
    const box = boundsAtTarget();
    const size = box.getSize(new THREE.Vector3());
    box.getCenter(goalTarget);
    const maxSize = Math.max(
      size.y,
      size.x / Math.max(camera.aspect, 0.5),
      size.z,
    );
    const distance = Math.max(
      0.3,
      (maxSize / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))) *
        1.35,
    );
    goalPosition
      .copy(goalTarget)
      .add(directions[preset].clone().normalize().multiplyScalar(distance));
    if (instant || reducedMotion) {
      camera.position.copy(goalPosition);
      controls.target.copy(goalTarget);
      controls.update();
      cameraAnimating = false;
    } else cameraAnimating = true;
  }
  function focusLandmark() {
    if (!options.isolated || !options.structureId) return false;
    const marker = landmarks.markers.find(
      (m) =>
        m.partId === options.selectedId &&
        m.structureId === options.structureId,
    );
    const mesh = selectedMesh();
    if (!marker || !mesh) return false;
    goalTarget.fromArray(marker.position).sub(center).multiplyScalar(scale);
    const normal = new THREE.Vector3()
      .fromBufferAttribute(
        mesh.geometry.getAttribute("normal"),
        marker.vertexIndex,
      )
      .normalize();
    const distance = Math.max(0.35, mesh.geometry.boundingSphere!.radius * 2.9);
    goalPosition
      .copy(goalTarget)
      .addScaledVector(
        normal.lengthSq() > 0.5 ? normal : directions.front,
        distance,
      );
    cameraAnimating = true;
    needsRender = true;
    if (reducedMotion) {
      camera.position.copy(goalPosition);
      controls.target.copy(goalTarget);
      controls.update();
      cameraAnimating = false;
    }
    return true;
  }
  function resize() {
    const width = host.clientWidth,
      height = host.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    fit(currentPreset, true);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  const visibilityObserver = new IntersectionObserver((entries) => {
    inView = entries[0]?.isIntersecting ?? true;
  });
  visibilityObserver.observe(host);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downX = 0,
    downY = 0;
  function hit(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      (-(event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(
      allBones.filter((mesh) => mesh.visible),
      false,
    )[0]?.object as BoneMesh | undefined;
  }
  function onDown(event: PointerEvent) {
    downX = event.clientX;
    downY = event.clientY;
    tooltip.hidden = true;
    cameraAnimating = false;
  }
  function onUp(event: PointerEvent) {
    if (Math.hypot(event.clientX - downX, event.clientY - downY) < 5)
      callbacks.select(hit(event)?.userData.part || null);
  }
  function onMove(event: PointerEvent) {
    if (event.buttons || event.pointerType !== "mouse") {
      tooltip.hidden = true;
      return;
    }
    const found = hit(event);
    tooltip.hidden = !found;
    if (found) {
      const rect = canvas.getBoundingClientRect();
      tooltip.textContent = partName(found.userData.part);
      tooltip.style.left = `${Math.min(event.clientX - rect.left + 12, rect.width - 170)}px`;
      tooltip.style.top = `${Math.max(8, event.clientY - rect.top - 34)}px`;
    }
    canvas.style.cursor = found ? "pointer" : "grab";
  }
  const onLeave = () => {
    tooltip.hidden = true;
  };
  const onLost = (event: Event) => {
    event.preventDefault();
    callbacks.error(
      "3D-контекст был остановлен устройством. Нажмите «Повторить», чтобы загрузить модель снова.",
    );
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerleave", onLeave);
  canvas.addEventListener("webglcontextlost", onLost);
  controls.addEventListener("start", () => {
    cameraAnimating = false;
  });
  controls.addEventListener("change", () => {
    needsRender = true;
  });
  const projected = new THREE.Vector3();
  const worldPoint = new THREE.Vector3();
  const labelRaycaster = new THREE.Raycaster();
  function animate(time: number) {
    if (disposed) return;
    frame = requestAnimationFrame(animate);
    const dt = Math.min((time - lastTime) / 1000 || 0.016, 0.5);
    if (time - lastTime < 1000 / 40) return;
    lastTime = time;
    if (document.hidden || !inView) return;
    const moving =
      cameraAnimating ||
      Math.abs(currentExplosion - options.explode) > 0.0001 ||
      controls.autoRotate;
    const easing = reducedMotion ? 1 : 1 - Math.exp(-dt * 7);
    currentExplosion += (options.explode - currentExplosion) * easing;
    if (Math.abs(currentExplosion - options.explode) < 0.001)
      currentExplosion = options.explode;
    for (const mesh of allMeshes)
      mesh.position
        .copy(mesh.userData.direction)
        .multiplyScalar(options.isolated ? 0 : currentExplosion);
    if (cameraAnimating) {
      camera.position.lerp(goalPosition, easing);
      controls.target.lerp(goalTarget, easing);
      if (
        camera.position.distanceTo(goalPosition) < 0.002 &&
        controls.target.distanceTo(goalTarget) < 0.002
      )
        cameraAnimating = false;
    }
    controls.update(dt);
    if (!needsRender && !moving) return;
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld();
    canvas.dataset.explosion = currentExplosion.toFixed(3);
    for (const { element, mesh } of labels) {
      const enabled =
        options.labels &&
        mesh.visible &&
        !options.isolated &&
        (options.explode > 0.2 || mesh.name === options.selectedId);
      element.hidden = !enabled;
      if (enabled) {
        projected.copy(mesh.userData.center).add(mesh.position).project(camera);
        element.hidden =
          projected.z > 1 ||
          projected.z < -1 ||
          Math.abs(projected.x) > 0.98 ||
          Math.abs(projected.y) > 0.98;
        element.style.left = `${(projected.x * 0.5 + 0.5) * 100}%`;
        element.style.top = `${(-projected.y * 0.5 + 0.5) * 100}%`;
      }
    }
    const anchors: LabelAnchor[] = [];
    const occluders = allMeshes.filter((mesh) => mesh.visible);
    let occludedCount = 0;
    for (const {
      element,
      mesh,
      point,
      normal,
      leader,
      id,
      group,
    } of landmarkLabels) {
      const enabled =
        mesh.visible &&
        mesh.name === options.selectedId &&
        (options.labels || id === options.structureId) &&
        (!options.landmarkGroup ||
          options.landmarkGroup === "all" ||
          group === options.landmarkGroup ||
          id === options.structureId);
      element.hidden = !enabled;
      leader.style.display = "none";
      element.classList.toggle("active", enabled && id === options.structureId);
      if (enabled) {
        worldPoint.copy(point).add(mesh.position);
        projected.copy(worldPoint).project(camera);
        element.hidden =
          projected.z > 1 ||
          projected.z < -1 ||
          Math.abs(projected.x) > 0.98 ||
          Math.abs(projected.y) > 0.98;
        if (
          !element.hidden &&
          !surfacePointVisible(
            worldPoint,
            normal,
            camera,
            occluders,
            labelRaycaster,
          )
        ) {
          element.hidden = true;
          occludedCount++;
        }
        element.dataset.occluded = String(element.hidden);
        if (!element.hidden)
          anchors.push({
            id,
            x: (projected.x * 0.5 + 0.5) * host.clientWidth,
            y: (-projected.y * 0.5 + 0.5) * host.clientHeight,
            active: id === options.structureId,
            distance: camera.position.distanceTo(worldPoint),
          });
      }
    }
    const placements = placeLabels(
      anchors,
      host.clientWidth,
      host.clientHeight,
    );
    for (const { element, leader, id } of landmarkLabels) {
      const placed = placements.find((item) => item.id === id);
      element.hidden = !placed;
      if (!placed) continue;
      element.style.left = `${placed.x}px`;
      element.style.top = `${placed.y}px`;
      if (
        Math.hypot(placed.x - placed.anchorX, placed.y - placed.anchorY) > 2
      ) {
        leader.setAttribute("x1", String(placed.anchorX));
        leader.setAttribute("y1", String(placed.anchorY));
        leader.setAttribute("x2", String(placed.x));
        leader.setAttribute("y2", String(placed.y));
        leader.style.display = "";
      }
    }
    canvas.dataset.visibleLandmarks = String(placements.length);
    canvas.dataset.occludedLandmarks = String(occludedCount);
    renderer.render(scene, camera);
    needsRender = false;
    canvas.dataset.camera = camera.position
      .toArray()
      .map((v) => v.toFixed(3))
      .join(",");
    canvas.dataset.triangles = String(renderer.info.render.triangles);
    canvas.dataset.ready = "true";
  }
  applyOptions();
  resize();
  fit("front", true);
  frame = requestAnimationFrame(animate);
  callbacks.ready(manifest, [
    ...new Set(landmarks.markers.map((m) => m.structureId)),
  ]);
  if (firstPart) callbacks.select(firstPart);
  return {
    update(next) {
      const reframe =
        next.isolated !== options.isolated ||
        (next.selectedId !== options.selectedId && next.isolated) ||
        next.department !== options.department ||
        next.explode !== options.explode;
      const focusChanged =
        next.structureId !== options.structureId ||
        next.selectedId !== options.selectedId;
      options = { ...next };
      applyOptions();
      if ((focusChanged || reframe) && !focusLandmark() && reframe) fit();
    },
    preset(preset) {
      fit(preset);
    },
    zoom(direction) {
      goalTarget.copy(controls.target);
      goalPosition
        .copy(camera.position)
        .sub(controls.target)
        .multiplyScalar(direction > 0 ? 0.8 : 1.25)
        .clampLength(0.18, 20)
        .add(controls.target);
      cameraAnimating = true;
    },
    reset() {
      fit("front");
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      visibilityObserver.disconnect();
      controls.dispose();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("webglcontextlost", onLost);
      for (const mesh of allMeshes) {
        mesh.geometry.dispose();
        mesh.material.dispose();
      }
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      tooltip.remove();
      labelLayer.remove();
      scene.clear();
    },
  };
}
