import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  Download,
  LoaderCircle,
  Minus,
  Plus,
  RotateCcw,
  RotateCw,
  Expand,
} from "lucide-react";
import type { BodyManifest, BodyOptions } from "../lib/body-model";
import type { BodyScene } from "../lib/body-scene";
import { bodyName } from "../data/body-terms";

export default function BodyViewer({
  options,
  setOptions,
  manifest,
  conceal = false,
  compact = false,
}: {
  options: BodyOptions;
  setOptions: Dispatch<SetStateAction<BodyOptions>>;
  manifest: BodyManifest;
  conceal?: boolean;
  compact?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null),
    scene = useRef<BodyScene | null>(null),
    latest = useRef(options),
    concealed = useRef(conceal);
  latest.current = { ...options, concealNames: conceal };
  concealed.current = conceal;
  const [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0),
    [progress, setProgress] = useState<[number, number]>([0, 0]);
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError("");
    import("../lib/body-scene")
      .then((module) =>
        module.createBodyScene(
          host.current!,
          latest.current,
          {
            select: (part) => {
              if (!concealed.current)
                setOptions((previous) => ({
                  ...previous,
                  selectedId: part.id,
                  selectedLandmark: null,
                }));
            },
            landmark: (id) => {
              if (!concealed.current)
                setOptions((previous) => ({
                  ...previous,
                  selectedLandmark: id,
                }));
            },
            ready: () => {
              if (!cancelled) setReady(true);
            },
            progress: (loaded, total) => {
              if (!cancelled) setProgress([loaded, total]);
            },
            error: (message) => {
              if (!cancelled) setError(message);
            },
          },
          () => cancelled,
        ),
      )
      .then((created) => {
        if (cancelled) created?.dispose();
        else {
          scene.current = created;
          created?.update(latest.current);
        }
      })
      .catch((reason) => {
        if (!cancelled)
          setError(
            reason instanceof Error ? reason.message : "Не удалось открыть 3D.",
          );
      });
    return () => {
      cancelled = true;
      scene.current?.dispose();
      scene.current = null;
    };
  }, [retry, setOptions]);
  useEffect(() => {
    scene.current?.update({ ...options, concealNames: conceal });
  }, [options, conceal]);
  const selected = manifest.parts.find(
    (part) => part.id === options.selectedId,
  );
  function saveImage() {
    const data = scene.current?.capture();
    if (!data) return;
    const link = document.createElement("a");
    link.href = data;
    link.download = `cranium-${selected?.name.replaceAll(" ", "-") || "skeleton"}.png`;
    link.click();
  }
  return (
    <div
      className={`skull-viewer body-viewer ${compact ? "body-viewer-compact" : ""}`}
    >
      <div className="model-heading">
        <span>
          {conceal
            ? "3D-задание"
            : selected && options.isolated
              ? bodyName(selected)
              : "Анатомия человека в 3D"}
        </span>
        <span className="model-dataset">Z-Anatomy</span>
      </div>
      <div className="model-canvas-wrap">
        <div className="model-host" ref={host} />
        {(!ready || progress[0] < progress[1]) && !error && (
          <div className="model-loading" role="status">
            <LoaderCircle size={27} />
            <span>Загружаем анатомию…</span>
            <small>
              {progress[1]
                ? `${progress[0]} из ${progress[1]} частей`
                : "Подготавливаем модель"}
            </small>
          </div>
        )}
        {error && (
          <div className="model-error" role="alert">
            <p>{error}</p>
            <button
              className="button secondary"
              onClick={() => setRetry((value) => value + 1)}
            >
              Повторить
            </button>
          </div>
        )}
        <div className="model-camera-tools">
          <button
            aria-label="Приблизить анатомию"
            onClick={() => scene.current?.zoom(1)}
          >
            <Plus size={16} />
          </button>
          <button
            aria-label="Отдалить анатомию"
            onClick={() => scene.current?.zoom(-1)}
          >
            <Minus size={16} />
          </button>
          <button
            aria-label="Вид анатомии спереди"
            onClick={() => scene.current?.preset("front")}
          >
            <RotateCcw size={15} />
          </button>
        </div>
        <span className="model-gesture">
          Потяните для вращения · два пальца для масштаба
        </span>
      </div>
      <div className="model-preset-bar" aria-label="Ракурс анатомии">
        {[
          ["front", "Спереди"],
          ["back", "Сзади"],
          ["left", "Слева"],
          ["right", "Справа"],
          ["top", "Сверху"],
          ["base", "Снизу"],
        ].map(([id, name]) => (
          <button key={id} onClick={() => scene.current?.preset(id)}>
            {name}
          </button>
        ))}
      </div>
      <div className="model-actions">
        <button
          aria-pressed={options.rotate}
          className={options.rotate ? "selected" : ""}
          onClick={() =>
            setOptions((value) => ({ ...value, rotate: !value.rotate }))
          }
        >
          <RotateCw size={14} />
          Вращение
        </button>
        {!compact && !options.isolated && (
          <button
            aria-pressed={options.explode > 0}
            onClick={() =>
              setOptions((value) => ({
                ...value,
                explode: value.explode ? 0 : 1,
              }))
            }
          >
            <Expand size={14} />
            {options.explode ? "Собрать" : "Разобрать"}
          </button>
        )}
        {!conceal && (
          <button onClick={saveImage} disabled={!ready}>
            <Download size={14} />
            Сохранить изображение
          </button>
        )}
      </div>
    </div>
  );
}
