import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { annotations } from "../data/annotations";
import type { Bone } from "../data/anatomy";

export function AnnotatedFigure({
  bone,
  selected,
  select,
  file = bone.illustration,
}: {
  bone: Bone;
  selected: string | null;
  select: (id: string) => void;
  file?: string;
}) {
  const [show, setShow] = useState(true);
  const points = (
    file === bone.illustration ? annotations[bone.id] || [] : []
  ).flatMap((a) => {
    const s = bone.structures.find((s) => s.latin === a.latin);
    return s
      ? [{ ...a, structure: s, number: bone.structures.indexOf(s) + 1 }]
      : [];
  });
  const active = bone.structures.find((s) => s.id === selected);
  return (
    <>
      {points.length > 0 && (
        <div className="annotation-toolbar">
          <span>Русские подписи · {points.length} ориентиров</span>
          <button
            onClick={() => setShow((x) => !x)}
            aria-pressed={show}
            aria-label={
              show ? "Скрыть маркеры структур" : "Показать маркеры структур"
            }
          >
            {show ? <Eye size={14} /> : <EyeOff size={14} />}
            {show ? "Включены" : "Выключены"}
          </button>
        </div>
      )}
      <div className="illustration-button">
        <div className="annotated-image">
          <img
            src={`${import.meta.env.BASE_URL}illustrations/${file}`}
            alt={`Анатомическая иллюстрация OpenStax: ${bone.name}. Оригинальные подписи на английском.`}
          />
          {show && (
            <svg
              className="annotation-leaders"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {points.map((p) => (
                <line
                  key={p.latin}
                  x1={p.x}
                  y1={p.y}
                  x2={p.labelX}
                  y2={p.labelY}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
          )}
          {show &&
            points.map((p) => (
              <button
                key={p.latin}
                className={`anatomy-pin ${selected === p.structure.id ? "active" : ""}`}
                style={{ left: `${p.labelX}%`, top: `${p.labelY}%` }}
                onClick={() => select(p.structure.id)}
                aria-label={`На иллюстрации: ${p.structure.name}`}
                aria-pressed={selected === p.structure.id}
                title={`${p.structure.name} · ${p.latin}`}
              >
                <span>{p.number}</span>
              </button>
            ))}
        </div>
      </div>
      {active && (
        <div className="selected-annotation" aria-live="polite">
          <strong>{active.name}</strong>
          <span lang="la">{active.latin}</span>
          <p>{active.note}</p>
          {!points.some((p) => p.structure.id === active.id) && (
            <small>
              На этой проекции структура не отмечена; расположение описано в
              пояснении.
            </small>
          )}
        </div>
      )}
    </>
  );
}
