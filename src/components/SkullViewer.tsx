import { useEffect, useRef, useState } from "react";
import {
  Box,
  Check,
  ChevronDown,
  Expand,
  Eye,
  Focus,
  Layers3,
  LoaderCircle,
  Minus,
  Plus,
  RotateCcw,
  RotateCw,
  X,
} from "lucide-react";
import { getBone } from "../data/anatomy";
import {
  defaultModelOptions,
  partName,
  type CameraPreset,
  type ModelManifest,
  type ModelOptions,
  type ModelPart,
} from "../lib/model";
import type { SkullScene } from "../lib/skull-scene";

export default function SkullViewer({
  boneId,
  side,
  structureId,
  onStructureSelect,
  compact = false,
  onOpen,
}: {
  boneId?: string;
  side?: "left" | "right";
  structureId?: string | null;
  onStructureSelect?: (id: string) => void;
  compact?: boolean;
  onOpen?: (id: string, side?: "left" | "right" | null) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SkullScene | null>(null);
  const [options, setOptions] = useState<ModelOptions>({
    ...defaultModelOptions,
    isolated: !!boneId,
    labels: !!boneId,
  });
  const optionsRef = useRef(options);
  const [manifest, setManifest] = useState<ModelManifest | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [preset, setPreset] = useState<CameraPreset>("front");
  const [coveredIds, setCoveredIds] = useState<string[]>([]);
  const selected = manifest?.parts.find((p) => p.id === options.selectedId);
  const bone = selected?.boneId ? getBone(selected.boneId) : undefined;
  const activeStructure = bone?.structures.find(
    (s) => s.id === options.structureId,
  );
  useEffect(() => {
    let cancelled = false;
    setState("loading");
    const select = (part: ModelPart | null) =>
      setOptions((previous) => {
        if (!part && previous.isolated) return previous;
        return {
          ...previous,
          selectedId: part?.id || null,
          structureId:
            part?.boneId && previous.structureId?.startsWith(`${part.boneId}-`)
              ? previous.structureId
              : null,
        };
      });
    import("../lib/skull-scene")
      .then((module) =>
        module.createSkullScene(
          hostRef.current!,
          optionsRef.current,
          boneId,
          side,
          {
            select,
            landmark: (id) => {
              setOptions((o) => ({ ...o, structureId: id, labels: true }));
              onStructureSelect?.(id);
            },
            ready: (data, covered) => {
              if (!cancelled) {
                setManifest(data);
                setCoveredIds(covered);
                setState("ready");
              }
            },
            error: (message) => {
              if (!cancelled) {
                setError(message);
                setState("error");
              }
            },
          },
          () => cancelled,
        ),
      )
      .then((scene) => {
        if (cancelled) scene?.dispose();
        else {
          sceneRef.current = scene;
          scene?.update(optionsRef.current);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Не удалось запустить 3D-просмотр.",
          );
          setState("error");
        }
      });
    return () => {
      cancelled = true;
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, [boneId, side, retry]);
  useEffect(() => {
    optionsRef.current = options;
    sceneRef.current?.update(options);
  }, [options]);
  useEffect(() => {
    if (structureId !== undefined)
      setOptions((o) => ({
        ...o,
        structureId,
        labels: structureId ? true : o.labels,
      }));
  }, [structureId]);
  const toggle = (key: "rotate" | "labels" | "colored" | "teeth") =>
    setOptions((o) => ({ ...o, [key]: !o[key] }));
  const changePreset = (value: CameraPreset) => {
    setPreset(value);
    sceneRef.current?.preset(value);
  };
  const restore = () => {
    setOptions((o) => ({
      ...defaultModelOptions,
      selectedId: boneId ? o.selectedId : null,
      isolated: !!boneId,
    }));
    setPreset("front");
    sceneRef.current?.reset();
  };
  return (
    <div className={`skull-viewer ${compact ? "compact-viewer" : ""}`}>
      <div className="model-heading">
        <span>
          <Box size={14} /> {boneId ? "Кость в 3D" : "Интерактивный череп"}
        </span>
        <span className="model-dataset">
          BodyParts3D <span>4.0</span>
        </span>
      </div>
      <div className="model-canvas-wrap">
        <div className="model-host" ref={hostRef} />
        {state === "loading" && (
          <div className="model-loading" role="status">
            <LoaderCircle size={26} />
            <span>Загружаем анатомическую модель…</span>
            <small>22 отдельные кости · 3,7 МБ</small>
          </div>
        )}
        {state === "error" && (
          <div className="model-error" role="alert">
            <Box size={28} />
            <p>{error}</p>
            <button
              className="button secondary"
              onClick={() => setRetry((x) => x + 1)}
            >
              Повторить <RotateCcw size={14} />
            </button>
          </div>
        )}
        {state === "ready" && (
          <>
            <div className="model-view-badge">
              {options.isolated && selected
                ? partName(selected)
                : options.explode > 0.1
                  ? "Разборка черепа"
                  : "Череп целиком"}
            </div>
            <div className="model-camera-tools">
              <button
                onClick={() => sceneRef.current?.zoom(1)}
                aria-label="Приблизить 3D-модель"
              >
                <Plus size={16} />
              </button>
              <button
                onClick={() => sceneRef.current?.zoom(-1)}
                aria-label="Отдалить 3D-модель"
              >
                <Minus size={16} />
              </button>
              <button onClick={restore} aria-label="Восстановить вид 3D-модели">
                <RotateCcw size={15} />
              </button>
            </div>
            <span className="model-gesture">
              Потяните для вращения · два пальца для масштаба
            </span>
          </>
        )}
      </div>
      <div className="model-preset-bar" aria-label="Проекция 3D-модели">
        {(
          [
            ["front", "Спереди"],
            ["left", "Слева"],
            ["back", "Сзади"],
            ["base", "Снизу"],
            ["top", "Сверху"],
          ] as const
        )
          .filter(([id]) => !compact || ["front", "left", "base"].includes(id))
          .map(([id, label]) => (
            <button
              key={id}
              disabled={state !== "ready"}
              className={preset === id ? "selected" : ""}
              aria-pressed={preset === id}
              onClick={() => changePreset(id)}
            >
              {label}
            </button>
          ))}
      </div>
      <div className="model-actions">
        <button
          className={options.explode > 0 ? "selected" : ""}
          disabled={state !== "ready"}
          aria-pressed={options.explode > 0}
          onClick={() =>
            setOptions((o) => ({
              ...o,
              isolated: false,
              explode: o.explode > 0 ? 0 : 1,
            }))
          }
        >
          <Expand size={15} />
          {options.explode > 0 ? "Собрать" : "Разобрать"}
        </button>
        <button
          className={options.rotate ? "selected" : ""}
          disabled={state !== "ready"}
          aria-pressed={options.rotate}
          onClick={() => toggle("rotate")}
        >
          <RotateCw size={15} />
          Вращение
        </button>
        {!compact && (
          <>
            <button
              className={options.isolated ? "selected" : ""}
              disabled={state !== "ready" || !selected}
              aria-pressed={options.isolated}
              onClick={() =>
                setOptions((o) => ({ ...o, isolated: !o.isolated, explode: 0 }))
              }
            >
              <Focus size={15} />
              {options.isolated ? "Весь череп" : "Кость отдельно"}
            </button>
            <button
              className={options.labels ? "selected" : ""}
              disabled={state !== "ready"}
              aria-pressed={options.labels}
              onClick={() => toggle("labels")}
            >
              <Eye size={15} />
              Подписи
            </button>
          </>
        )}
      </div>
      {!compact && (
        <div className="model-settings">
          <label className="model-explode-label">
            Разделение костей{" "}
            <output>{Math.round(options.explode * 100)}%</output>
            <input
              aria-label="Степень разборки черепа"
              type="range"
              min="0"
              max="100"
              value={Math.round(options.explode * 100)}
              disabled={state !== "ready"}
              onChange={(e) =>
                setOptions((o) => ({
                  ...o,
                  isolated: false,
                  explode: Number(e.target.value) / 100,
                }))
              }
            />
          </label>
          <div className="model-switches">
            <button
              aria-pressed={options.colored}
              className={options.colored ? "selected" : ""}
              onClick={() => toggle("colored")}
            >
              <span>{options.colored && <Check size={10} />}</span>Цвета костей
            </button>
            <button
              aria-pressed={options.teeth}
              className={options.teeth ? "selected" : ""}
              onClick={() => toggle("teeth")}
            >
              <span>{options.teeth && <Check size={10} />}</span>Зубы
            </button>
          </div>
        </div>
      )}
      {!compact && (
        <div className="model-inspector">
          <div className="model-select-row">
            <label className="model-select-label">
              <span>
                {boneId ? "Сторона кости" : "Выбрать кость, включая скрытые"}
              </span>
              <div>
                <select
                  aria-label="Выбор отдельной 3D-кости"
                  value={options.selectedId || ""}
                  onChange={(e) =>
                    setOptions((o) => ({
                      ...o,
                      selectedId: e.target.value || null,
                      isolated: e.target.value ? o.isolated : false,
                    }))
                  }
                >
                  <option value="">Все кости</option>
                  {manifest?.parts
                    .filter(
                      (p) =>
                        p.group === "bone" && (!boneId || p.boneId === boneId),
                    )
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {partName(p)}
                      </option>
                    ))}
                </select>
                <ChevronDown size={14} />
              </div>
            </label>
            {!boneId && (
              <label className="model-select-label department-select">
                <span>Отдел черепа</span>
                <div>
                  <select
                    aria-label="Отдел в 3D-просмотре"
                    value={options.department}
                    onChange={(e) =>
                      setOptions((o) => ({
                        ...o,
                        department: e.target
                          .value as ModelOptions["department"],
                        isolated: false,
                        selectedId: null,
                      }))
                    }
                  >
                    <option value="all">Все 22 кости</option>
                    <option value="cranial">Мозговой · 8</option>
                    <option value="facial">Лицевой · 14</option>
                  </select>
                  <ChevronDown size={14} />
                </div>
              </label>
            )}
          </div>
          {selected && bone && (
            <div className="selected-model-bone">
              <span
                className="model-selection-dot"
                style={{ background: bone.color }}
              />
              <div>
                <strong>{partName(selected)}</strong>
                <span lang="la">{bone.latin}</span>
              </div>
              {onOpen && (
                <button
                  className="text-button"
                  onClick={() => onOpen(bone.id, selected.side)}
                >
                  Структуры кости <Layers3 size={14} />
                </button>
              )}
              <button
                className="icon-button"
                onClick={() =>
                  setOptions((o) => ({
                    ...o,
                    selectedId: null,
                    isolated: false,
                  }))
                }
                aria-label="Снять выбор 3D-кости"
              >
                <X size={15} />
              </button>
            </div>
          )}
        </div>
      )}
      {!compact && bone && state === "ready" && (
        <div className="model-landmark-note">
          <span>
            3D-ориентиры:{" "}
            {bone.structures.filter((s) => coveredIds.includes(s.id)).length} из{" "}
            {bone.structures.length}
          </span>
          <small>
            Учебные метки Z-Anatomy · нажмите на номер или структуру в списке.
          </small>
          {activeStructure && (
            <div>
              <strong>{activeStructure.name}</strong>
              <em lang="la">{activeStructure.latin}</em>
              {!coveredIds.includes(activeStructure.id) && (
                <p>
                  Для этой структуры пространственная метка отсутствует;
                  пояснение доступно в списке.
                </p>
              )}
              {!onStructureSelect && <p>{activeStructure.note}</p>}
            </div>
          )}
        </div>
      )}
      {compact && onOpen && (
        <button
          className="model-open-full"
          onClick={() => onOpen(selected?.boneId || "", selected?.side)}
        >
          {selected?.boneId
            ? `${getBone(selected.boneId)?.name} — изучить`
            : "Открыть полный 3D-атлас"}
          <Box size={12} />
        </button>
      )}
      {!compact && (
        <div className="model-source-note">
          <span>
            22 кости · 28 зубов для контекста · анатомия взрослого человека
          </span>
          <a href="#/sources">Источник 3D-модели ↗</a>
        </div>
      )}
    </div>
  );
}
