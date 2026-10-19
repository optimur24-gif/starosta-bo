import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { bodyName, russianName, latinName } from "../data/body-terms";
import {
  landmarkGroup,
  loadBodyManifest,
  loadBodyPack,
  partVisible,
  type BodyManifest,
  type BodyOptions,
  type BodyPart,
} from "./body-model";
import { placeLabels, type LabelAnchor } from "./label-layout";
import { surfacePointVisible } from "./label-visibility";

type BodyMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> & {
  userData: { part: BodyPart; center: THREE.Vector3; direction: THREE.Vector3 };
};
export type BodyScene = {
  update: (options: BodyOptions) => void;
  preset: (name: string) => void;
  zoom: (direction: number) => void;
  capture: () => string;
  dispose: () => void;
};
type Callbacks = {
  select: (part: BodyPart) => void;
  landmark: (id: string) => void;
  ready: (manifest: BodyManifest) => void;
  progress: (loaded: number, total: number) => void;
  error: (message: string) => void;
};

export async function createBodyScene(
  host: HTMLElement,
  initial: BodyOptions,
  callbacks: Callbacks,
  cancelled: () => boolean,
): Promise<BodyScene | null> {
  const manifest = await loadBodyManifest();
  if (cancelled()) return null;
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    // Retain static geometry through canvas readback, screenshots and WebView compositing.
    preserveDrawingBuffer: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-label", "Интерактивная 3D-анатомия человека");
  canvas.setAttribute("role", "img");
  canvas.dataset.ready = "false";
  host.appendChild(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.0002, 30);
  camera.position.set(0.9, 0.9, 3.2);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.11;
  controls.minDistance = 0.006;
  controls.maxDistance = 9;
  controls.autoRotateSpeed = 0.6;
  scene.add(new THREE.HemisphereLight(0xfff8ea, 0x687566, 2));
  const key = new THREE.DirectionalLight(0xfff1d9, 2.4);
  key.position.set(3, 6, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xdde9fa, 1.1);
  fill.position.set(-4, 1, 2);
  scene.add(fill);
  const back = new THREE.DirectionalLight(0xffffff, 1.2);
  back.position.set(0, 3, -4);
  scene.add(back);
  const meshes = new Map<string, BodyMesh>();
  let options = { ...initial },
    disposed = false,
    frame = 0,
    generation = 0,
    dirty = true,
    inView = true,
    last = 0,
    explosion = 0,
    cameraMoving = false;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const goalPosition = camera.position.clone(),
    goalTarget = new THREE.Vector3(0, 0.85, 0);
  const layer = document.createElement("div");
  layer.className = "model-label-layer";
  host.appendChild(layer);
  const leaders = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  leaders.classList.add("model-label-leaders");
  layer.appendChild(leaders);
  const pins = new Map<
    string,
    { button: HTMLButtonElement; line: SVGLineElement }
  >();
  for (const marker of manifest.landmarks) {
    const button = document.createElement("button");
    button.className = "model-landmark-pin";
    button.hidden = true;
    const siblings = manifest.landmarks.filter(
      (m) => m.parent === marker.parent,
    );
    button.textContent = String(siblings.indexOf(marker) + 1);
    button.title = `${russianName(marker) || marker.name} · ${latinName(marker) || ""}`;
    button.setAttribute(
      "aria-label",
      `Ориентир: ${russianName(marker) || marker.name}`,
    );
    button.addEventListener("click", () => callbacks.landmark(marker.id));
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.style.display = "none";
    leaders.appendChild(line);
    layer.appendChild(button);
    pins.set(marker.id, { button, line });
  }
  const tooltip = document.createElement("div");
  tooltip.className = "model-hover-label";
  tooltip.hidden = true;
  host.appendChild(tooltip);
  const colors: Record<string, string> = {
    bone: "#e6d8b8",
    tooth: "#fff4dc",
    muscle: "#c16e67",
    ligament: "#b9cc9c",
    joint: "#a0bdd0",
    connective: "#e7d9c2",
    articular: "#48a7dd",
    muscleZone: "#e47755",
    ligamentZone: "#9e72d7",
  };
  function makeMesh(part: BodyPart, binary: ArrayBuffer) {
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
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const color = part.zone
      ? part.zone === "articular"
        ? colors.articular
        : colors[`${part.zone}Zone`]
      : colors[part.kind];
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.72,
      side: THREE.DoubleSide,
      polygonOffset: !!part.zone,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
      transparent: !!part.zone,
      opacity: part.zone ? 0.92 : 1,
      depthWrite: !part.zone,
    });
    const mesh = new THREE.Mesh(geometry, material) as BodyMesh;
    const center = geometry.boundingBox!.getCenter(new THREE.Vector3());
    mesh.userData = {
      part,
      center,
      direction: center
        .clone()
        .sub(new THREE.Vector3(0, 0.85, 0))
        .normalize()
        .multiplyScalar(0.2),
    };
    mesh.name = part.id;
    mesh.visible = false;
    mesh.renderOrder = part.zone ? 2 : 0;
    scene.add(mesh);
    meshes.set(part.id, mesh);
    return mesh;
  }
  const directions: Record<string, THREE.Vector3> = {
    front: new THREE.Vector3(0.08, 0.02, 1),
    back: new THREE.Vector3(0, 0.03, -1),
    left: new THREE.Vector3(1, 0.02, 0.02),
    right: new THREE.Vector3(-1, 0.02, 0.02),
    top: new THREE.Vector3(0.02, 1, 0.05),
    base: new THREE.Vector3(0.02, -1, 0.05),
  };
  let currentPreset = "front";
  function fit(preset = currentPreset, instant = false) {
    currentPreset = preset;
    const box = new THREE.Box3();
    for (const mesh of meshes.values())
      if (mesh.visible && !mesh.userData.part.zone) {
        const moved = mesh.geometry.boundingBox!.clone();
        if (!options.isolated)
          moved.translate(
            mesh.userData.direction.clone().multiplyScalar(options.explode),
          );
        box.union(moved);
      }
    if (box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3());
    box.getCenter(goalTarget);
    const span = Math.max(
      size.y,
      size.x / Math.max(camera.aspect, 0.35),
      size.z,
      0.004,
    );
    const distance =
      (span / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))) * 1.28;
    goalPosition
      .copy(goalTarget)
      .addScaledVector(
        (directions[preset] || directions.front).clone().normalize(),
        distance,
      );
    if (instant || reduced) {
      camera.position.copy(goalPosition);
      controls.target.copy(goalTarget);
      controls.update();
      cameraMoving = false;
    } else cameraMoving = true;
    dirty = true;
  }
  function materialState() {
    for (const mesh of meshes.values()) {
      const part = mesh.userData.part;
      mesh.visible = partVisible(part, options);
      mesh.material.emissive.set(
        part.id === options.selectedId && !part.zone ? "#6f8d4b" : "#000000",
      );
      mesh.material.emissiveIntensity = 0.15;
    }
    controls.autoRotate = options.rotate && !reduced;
    dirty = true;
  }
  async function refresh(reframe = true) {
    const request = ++generation;
    const wanted = manifest.parts.filter((part) => partVisible(part, options));
    for (const mesh of meshes.values())
      mesh.visible = partVisible(mesh.userData.part, options);
    const files = [
      ...new Set(
        wanted.filter((part) => !meshes.has(part.id)).map((part) => part.pack),
      ),
    ];
    let loaded = 0;
    callbacks.progress(loaded, files.length);
    for (let offset = 0; offset < files.length; offset += 3) {
      await Promise.all(
        files.slice(offset, offset + 3).map(async (file) => {
          const binary = await loadBodyPack(file, manifest);
          if (disposed || cancelled() || request !== generation) return;
          for (const part of wanted)
            if (part.pack === file && !meshes.has(part.id))
              makeMesh(part, binary);
          callbacks.progress(++loaded, files.length);
        }),
      );
      if (disposed || cancelled() || request !== generation) return;
    }
    // A pack may already be cached while a previous refresh was superseded.
    for (const part of wanted)
      if (!meshes.has(part.id)) {
        const binary = await loadBodyPack(part.pack, manifest);
        if (disposed || request !== generation) return;
        makeMesh(part, binary);
      }
    materialState();
    if (reframe) fit();
    canvas.dataset.ready = "true";
    callbacks.ready(manifest);
  }
  const ray = new THREE.Raycaster(),
    pointer = new THREE.Vector2(),
    world = new THREE.Vector3(),
    projected = new THREE.Vector3(),
    normal = new THREE.Vector3();
  function pick(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      (-(event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    ray.near = 0;
    ray.far = 30;
    ray.setFromCamera(pointer, camera);
    return ray.intersectObjects(
      [...meshes.values()].filter(
        (mesh) => mesh.visible && !mesh.userData.part.zone,
      ),
      false,
    )[0]?.object as BodyMesh | undefined;
  }
  let downX = 0,
    downY = 0;
  const down = (event: PointerEvent) => {
    downX = event.clientX;
    downY = event.clientY;
    cameraMoving = false;
    tooltip.hidden = true;
  };
  const up = (event: PointerEvent) => {
    if (Math.hypot(event.clientX - downX, event.clientY - downY) < 5) {
      const found = pick(event);
      if (found) callbacks.select(found.userData.part);
    }
  };
  const move = (event: PointerEvent) => {
    if (
      options.concealNames ||
      event.buttons ||
      event.pointerType !== "mouse"
    ) {
      tooltip.hidden = true;
      return;
    }
    const found = pick(event);
    tooltip.hidden = !found;
    if (found) {
      const rect = canvas.getBoundingClientRect();
      tooltip.textContent = bodyName(found.userData.part);
      tooltip.style.left = `${Math.min(event.clientX - rect.left + 12, rect.width - 190)}px`;
      tooltip.style.top = `${Math.max(8, event.clientY - rect.top - 30)}px`;
    }
  };
  const leave = () => {
    tooltip.hidden = true;
  };
  const lost = (event: Event) => {
    event.preventDefault();
    callbacks.error("Устройство остановило 3D. Повторите загрузку модели.");
  };
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerleave", leave);
  canvas.addEventListener("webglcontextlost", lost);
  controls.addEventListener("change", () => {
    dirty = true;
  });
  controls.addEventListener("start", () => {
    cameraMoving = false;
  });
  const observer = new ResizeObserver(() => {
    const width = host.clientWidth,
      height = host.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    fit(currentPreset, true);
  });
  observer.observe(host);
  const visibility = new IntersectionObserver((entries) => {
    inView = entries[0]?.isIntersecting ?? true;
    if (inView) dirty = true;
  });
  visibility.observe(host);
  function render(time: number) {
    if (disposed) return;
    frame = requestAnimationFrame(render);
    const dt = Math.min((time - last) / 1000 || 0.016, 0.5);
    if (time - last < 1000 / 35) return;
    last = time;
    if (document.hidden || !inView) return;
    const moving =
      cameraMoving ||
      Math.abs(explosion - options.explode) > 0.0001 ||
      controls.autoRotate;
    const easing = reduced ? 1 : 1 - Math.exp(-dt * 7);
    explosion += (options.explode - explosion) * easing;
    if (Math.abs(explosion - options.explode) < 0.001)
      explosion = options.explode;
    for (const mesh of meshes.values())
      mesh.position
        .copy(mesh.userData.direction)
        .multiplyScalar(options.isolated ? 0 : explosion);
    if (cameraMoving) {
      camera.position.lerp(goalPosition, easing);
      controls.target.lerp(goalTarget, easing);
      if (
        camera.position.distanceTo(goalPosition) < 0.0002 &&
        controls.target.distanceTo(goalTarget) < 0.0002
      )
        cameraMoving = false;
    }
    controls.update(dt);
    if (!dirty && !moving) return;
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld();
    const occluders = [...meshes.values()].filter(
      (mesh) => mesh.visible && !mesh.userData.part.zone,
    );
    const candidates: LabelAnchor[] = [];
    for (const marker of manifest.landmarks) {
      const pin = pins.get(marker.id)!;
      pin.button.hidden = true;
      pin.line.style.display = "none";
      if (
        !options.labels ||
        !options.isolated ||
        marker.parent !== options.selectedId ||
        (options.landmarkGroup !== "all" &&
          landmarkGroup(marker.name) !== options.landmarkGroup)
      )
        continue;
      world.fromArray(marker.position);
      normal.fromArray(marker.normal);
      projected.copy(world).project(camera);
      if (
        Math.abs(projected.x) > 0.98 ||
        Math.abs(projected.y) > 0.98 ||
        projected.z < -1 ||
        projected.z > 1 ||
        !surfacePointVisible(world, normal, camera, occluders, ray, 0.00015)
      )
        continue;
      candidates.push({
        id: marker.id,
        x: (projected.x * 0.5 + 0.5) * host.clientWidth,
        y: (-projected.y * 0.5 + 0.5) * host.clientHeight,
        active: marker.id === options.selectedLandmark,
        distance: camera.position.distanceTo(world),
      });
    }
    const placements = placeLabels(
      candidates,
      host.clientWidth,
      host.clientHeight,
    );
    for (const placed of placements) {
      const pin = pins.get(placed.id)!;
      pin.button.hidden = false;
      pin.button.classList.toggle("active", placed.active || false);
      pin.button.style.left = `${placed.x}px`;
      pin.button.style.top = `${placed.y}px`;
      if (
        Math.hypot(placed.x - placed.anchorX, placed.y - placed.anchorY) > 2
      ) {
        for (const [key, value] of Object.entries({
          x1: placed.anchorX,
          y1: placed.anchorY,
          x2: placed.x,
          y2: placed.y,
        }))
          pin.line.setAttribute(key, String(value));
        pin.line.style.display = "";
      }
    }
    renderer.render(scene, camera);
    dirty = false;
    canvas.dataset.selected = options.selectedId || "";
    canvas.dataset.isolated = String(options.isolated);
    canvas.dataset.visibleParts = String(occluders.length);
    canvas.dataset.visibleZones = String(
      [...meshes.values()].filter((m) => m.visible && m.userData.part.zone)
        .length,
    );
    canvas.dataset.visibleLandmarks = String(placements.length);
    canvas.dataset.triangles = String(renderer.info.render.triangles);
    canvas.dataset.explosion = explosion.toFixed(3);
    canvas.dataset.camera = camera.position
      .toArray()
      .map((v) => v.toFixed(4))
      .join(",");
  }
  frame = requestAnimationFrame(render);
  try {
    await refresh();
  } catch (error) {
    if (!disposed)
      callbacks.error(
        error instanceof Error
          ? error.message
          : "Не удалось загрузить анатомию.",
      );
  }
  return {
    update(next) {
      const reframe =
        (next.selectedId !== options.selectedId && next.isolated) ||
        next.isolated !== options.isolated ||
        next.region !== options.region ||
        next.kinds.join() !== options.kinds.join() ||
        next.explode !== options.explode;
      const focus = next.selectedLandmark !== options.selectedLandmark;
      options = { ...next };
      materialState();
      void refresh(reframe)
        .then(() => {
          if (focus && options.selectedLandmark) {
            const marker = manifest.landmarks.find(
              (m) => m.id === options.selectedLandmark,
            );
            const mesh = meshes.get(options.selectedId || "");
            if (marker && mesh) {
              goalTarget.fromArray(marker.position);
              goalPosition
                .copy(goalTarget)
                .addScaledVector(
                  normal.fromArray(marker.normal).normalize(),
                  Math.max(0.015, mesh.geometry.boundingSphere!.radius * 2.7),
                );
              cameraMoving = true;
              dirty = true;
            }
          }
        })
        .catch((error) =>
          callbacks.error(
            error instanceof Error ? error.message : "Ошибка загрузки модели.",
          ),
        );
    },
    preset(name) {
      fit(name);
    },
    zoom(direction) {
      goalTarget.copy(controls.target);
      goalPosition
        .copy(camera.position)
        .sub(controls.target)
        .multiplyScalar(direction > 0 ? 0.8 : 1.25)
        .clampLength(0.006, 9)
        .add(controls.target);
      cameraMoving = true;
      dirty = true;
    },
    capture() {
      renderer.render(scene, camera);
      const image = document.createElement("canvas");
      image.width = canvas.width;
      image.height = canvas.height;
      const context = image.getContext("2d")!;
      context.fillStyle = "#eff3e4";
      context.fillRect(0, 0, image.width, image.height);
      context.drawImage(canvas, 0, 0);
      dirty = true;
      return image.toDataURL("image/png");
    },
    dispose() {
      disposed = true;
      generation++;
      cancelAnimationFrame(frame);
      observer.disconnect();
      visibility.disconnect();
      controls.dispose();
      for (const mesh of meshes.values()) {
        mesh.geometry.dispose();
        mesh.material.dispose();
      }
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerleave", leave);
      canvas.removeEventListener("webglcontextlost", lost);
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      layer.remove();
      tooltip.remove();
      scene.clear();
    },
  };
}
