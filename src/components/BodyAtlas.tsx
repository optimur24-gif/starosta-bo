import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Layers3,
  Search,
} from "lucide-react";
import BodyViewer from "./BodyViewer";
import {
  bodyKindNames,
  bodyName,
  latinName,
  russianName,
} from "../data/body-terms";
import {
  bodyRegions,
  defaultBodyOptions,
  landmarkGroup,
  landmarkGroups,
  loadBodyManifest,
  skullSourceNames,
  zoneNames,
  type BodyKind,
  type BodyManifest,
  type BodyOptions,
  type BodyZone,
} from "../lib/body-model";
import {
  makeBodyQuiz,
  readBodyStudy,
  saveBodyStudy,
  shuffled,
  studyPool,
  type BodyQuestion,
  type StudyDirection,
} from "../lib/body-study";

type Mode = "atlas" | "notes" | "cards" | "test";
export default function BodyAtlas({ path = [] }: { path?: string[] }) {
  const [manifest, setManifest] = useState<BodyManifest | null>(null),
    [error, setError] = useState("");
  const [mode, setMode] = useState<Mode>(
    ["notes", "cards", "test"].includes(path[0]) ? (path[0] as Mode) : "atlas",
  );
  const [options, setOptions] = useState<BodyOptions>({
    ...defaultBodyOptions,
  });
  const [search, setSearch] = useState(""),
    [kind, setKind] = useState<BodyKind>("bone");
  const [direction, setDirection] = useState<StudyDirection>("ru-la"),
    [study, setStudy] = useState(readBodyStudy),
    [storageOk, setStorageOk] = useState(true);
  const [cardIds, setCardIds] = useState<string[]>([]),
    [cardIndex, setCardIndex] = useState(0),
    [flipped, setFlipped] = useState(false);
  const [questions, setQuestions] = useState<BodyQuestion[]>([]),
    [questionIndex, setQuestionIndex] = useState(0),
    [answers, setAnswers] = useState<string[]>([]),
    [finished, setFinished] = useState(false);
  useEffect(() => {
    let cancelled = false;
    loadBodyManifest()
      .then((value) => {
        if (cancelled) return;
        setManifest(value);
        if (path[0] === "bone" && path[1]) {
          const part = value.parts.find(
            (item) =>
              item.kind === "bone" &&
              item.name === skullSourceNames[path[1]] &&
              (!item.side || item.side === (path[2] || "left")),
          );
          if (part)
            setOptions((current) => ({
              ...current,
              selectedId: part.id,
              isolated: true,
              region: "head",
            }));
        }
      })
      .catch((reason) => {
        if (!cancelled) setError(String(reason.message || reason));
      });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    setStorageOk(saveBodyStudy(study));
  }, [study]);
  const candidates = useMemo(
    () =>
      manifest?.parts.filter(
        (part) =>
          part.kind === kind &&
          (options.region === "all" || part.region === options.region),
      ) || [],
    [manifest, kind, options.region],
  );
  const pool = useMemo(() => studyPool(candidates), [candidates]);
  const catalog = candidates.filter((part) =>
    `${bodyName(part)} ${latinName(part) || ""} ${part.name}`
      .toLocaleLowerCase()
      .includes(search.toLocaleLowerCase()),
  );
  const selected = manifest?.parts.find(
    (part) => part.id === options.selectedId,
  );
  const landmarks =
    manifest?.landmarks.filter(
      (item) =>
        item.parent === selected?.id &&
        (options.landmarkGroup === "all" ||
          landmarkGroup(`${item.name} ${russianName(item) || ""}`) ===
            options.landmarkGroup),
    ) || [];
  const activeLandmark = manifest?.landmarks.find(
    (item) => item.id === options.selectedLandmark,
  );
  const card = manifest?.parts.find((part) => part.id === cardIds[cardIndex]);
  const question = questions[questionIndex],
    answer = answers[questionIndex];
  function isolate(id: string) {
    setOptions((current) => ({
      ...current,
      selectedId: id,
      isolated: true,
      selectedLandmark: null,
      zones: [],
      explode: 0,
    }));
  }
  function switchMode(next: Mode) {
    setMode(next);
    setQuestions([]);
    setFinished(false);
    setCardIds([]);
    setOptions((current) => ({
      ...current,
      isolated: false,
      selectedLandmark: null,
      zones: [],
      labels: true,
    }));
  }
  function startCards() {
    const ids = shuffled(pool).map((part) => part.id);
    setCardIds(ids);
    setCardIndex(0);
    setFlipped(false);
    if (ids[0]) {
      isolate(ids[0]);
      setOptions((current) => ({ ...current, labels: false }));
    }
  }
  function nextCard(step: number) {
    const index = (cardIndex + step + cardIds.length) % cardIds.length;
    setCardIndex(index);
    setFlipped(false);
    isolate(cardIds[index]);
  }
  function startQuiz(ids?: string[]) {
    const list = makeBodyQuiz(
      ids
        ? studyPool(manifest!.parts.filter((part) => ids.includes(part.id)))
        : pool,
      direction,
    );
    setQuestions(list);
    setQuestionIndex(0);
    setAnswers([]);
    setFinished(false);
    if (list[0]) {
      isolate(list[0].part.id);
      setOptions((current) => ({ ...current, labels: false }));
    }
  }
  function nextQuestion() {
    if (questionIndex + 1 < questions.length) {
      setQuestionIndex((index) => index + 1);
      isolate(questions[questionIndex + 1].part.id);
    } else {
      const score = questions.filter(
        (item, index) => item.correctId === answers[index],
      ).length;
      setStudy((current) => ({
        ...current,
        history: [
          {
            date: new Date().toISOString(),
            score,
            total: questions.length,
            direction,
            mistakes: questions
              .filter((item, index) => item.correctId !== answers[index])
              .map((item) => item.part.id),
          },
          ...current.history,
        ].slice(0, 30),
      }));
      setFinished(true);
    }
  }
  function exportNote() {
    if (!selected) return;
    const content = `# ${bodyName(selected)}\n\n${latinName(selected) || selected.name}\n\n${study.notes[selected.id] || ""}\n\nИсточник модели: Z-Anatomy, CC BY-SA 4.0. https://www.z-anatomy.com/\n`;
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/markdown;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `anatomy-${selected.id}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }
  if (error)
    return (
      <div role="alert" className="empty-state">
        <p>{error}</p>
        <button className="button primary" onClick={() => location.reload()}>
          Повторить загрузку
        </button>
      </div>
    );
  if (!manifest) return <p role="status">Загружаем каталог анатомии…</p>;
  const learning =
    (mode === "cards" && !!card) ||
    (mode === "test" && !!question && !finished);
  return (
    <section className="body-atlas">
      <div className="page-title">
        <div className="eyebrow">ОТ ЧЕРЕПА ДО КОНЧИКОВ ПАЛЬЦЕВ</div>
        <h1>Анатомия всего тела</h1>
        <p>
          Скелет, мышцы и связки. Настоящая геометрия Z-Anatomy, названия на
          русском и латыни.
        </p>
      </div>
      <div className="body-mode-tabs" aria-label="Режим изучения">
        {(
          [
            ["atlas", "3D-атлас", Layers3],
            ["notes", "3D-конспект", BookOpen],
            ["cards", "Карточки", ChevronRight],
            ["test", "3D-тест", GraduationCap],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            className={mode === id ? "active" : ""}
            aria-pressed={mode === id}
            onClick={() => switchMode(id)}
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
      </div>
      {!storageOk && (
        <p role="status">
          Хранилище недоступно: заметки и результаты сохраняются до закрытия
          страницы.
        </p>
      )}
      {!learning && (
        <div className="body-filters">
          <label>
            Раздел
            <select
              aria-label="Раздел"
              value={kind}
              onChange={(event) => {
                const next = event.target.value as BodyKind;
                setKind(next);
                setOptions((current) => ({
                  ...current,
                  kinds: next === "bone" ? ["bone", "tooth"] : [next],
                  isolated: false,
                  selectedId: null,
                }));
              }}
            >
              <option value="bone">Кости</option>
              <option value="muscle">Мышцы</option>
              <option value="ligament">Связки</option>
              <option value="joint">Суставы и хрящи</option>
              <option value="connective">Сухожилия и апоневрозы</option>
            </select>
          </label>
          <label>
            Область
            <select
              aria-label="Область"
              value={options.region}
              onChange={(event) =>
                setOptions((current) => ({
                  ...current,
                  region: event.target.value as BodyOptions["region"],
                  isolated: false,
                  selectedId: null,
                }))
              }
            >
              {bodyRegions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {(mode === "atlas" || mode === "notes") && (
        <>
          <div className="body-system-switches" aria-label="Слои анатомии">
            {(["bone", "muscle", "ligament", "joint"] as BodyKind[]).map(
              (layer) => (
                <button
                  key={layer}
                  aria-pressed={options.kinds.includes(layer)}
                  onClick={() =>
                    setOptions((current) => ({
                      ...current,
                      isolated: false,
                      kinds: current.kinds.includes(layer)
                        ? current.kinds.filter((item) => item !== layer)
                        : [...current.kinds, layer],
                    }))
                  }
                >
                  {
                    (
                      {
                        bone: "Кости",
                        muscle: "Мышцы",
                        ligament: "Связки",
                        joint: "Суставы",
                      } as Record<string, string>
                    )[layer]
                  }
                </button>
              ),
            )}
          </div>
          <div className="body-layout">
            <div className="body-main">
              <BodyViewer
                options={options}
                setOptions={setOptions}
                manifest={manifest}
              />
              {selected && (
                <article className="body-detail">
                  <div className="body-detail-heading">
                    <div>
                      <small>
                        {bodyKindNames[selected.kind]} ·{" "}
                        {
                          bodyRegions.find(
                            (region) => region.id === selected.region,
                          )?.name
                        }
                      </small>
                      <h2>{bodyName(selected)}</h2>
                      <p className="latin">
                        {latinName(selected) ||
                          "Латинское название не сопоставлено"}
                      </p>
                      {!russianName(selected) && (
                        <small>
                          Название из источника: русский перевод пока не
                          добавлен.
                        </small>
                      )}
                    </div>
                    <button
                      className="button secondary"
                      onClick={() =>
                        setOptions((current) => ({
                          ...current,
                          isolated: !current.isolated,
                          selectedLandmark: null,
                        }))
                      }
                    >
                      {options.isolated ? "Показать в теле" : "Отдельно"}
                    </button>
                  </div>
                  {selected.kind === "bone" && options.isolated && (
                    <>
                      <h3>Зоны на кости</h3>
                      <div className="body-zone-buttons">
                        {(Object.keys(zoneNames) as BodyZone[]).map((zone) => {
                          const count = manifest.parts.filter(
                            (part) =>
                              part.parent === selected.id && part.zone === zone,
                          ).length;
                          return (
                            <button
                              key={zone}
                              data-zone={zone}
                              disabled={!count}
                              aria-pressed={options.zones.includes(zone)}
                              onClick={() =>
                                setOptions((current) => ({
                                  ...current,
                                  zones: current.zones.includes(zone)
                                    ? current.zones.filter(
                                        (item) => item !== zone,
                                      )
                                    : [...current.zones, zone],
                                }))
                              }
                            >
                              <span />
                              {zoneNames[zone]}{" "}
                              <small>
                                {count ? `${count} участков` : "Нет разметки"}
                              </small>
                            </button>
                          );
                        })}
                      </div>
                      <p className="body-source-note">
                        Цвет показывает исходные поверхности Z-Anatomy. Для
                        части костей отдельные зоны в источнике отсутствуют.
                      </p>
                      <h3>Анатомические ориентиры</h3>
                      <div className="body-landmark-groups">
                        {landmarkGroups.map((group) => (
                          <button
                            key={group.id}
                            aria-pressed={options.landmarkGroup === group.id}
                            onClick={() =>
                              setOptions((current) => ({
                                ...current,
                                landmarkGroup: group.id,
                                selectedLandmark: null,
                              }))
                            }
                          >
                            {group.name}
                          </button>
                        ))}
                      </div>
                      {activeLandmark && (
                        <p className="body-active-landmark">
                          <strong>
                            {russianName(activeLandmark) || activeLandmark.name}
                          </strong>
                          <br />
                          <i>{latinName(activeLandmark) || ""}</i>
                        </p>
                      )}
                      <div className="body-landmark-list">
                        {landmarks.map((item) => (
                          <button
                            key={item.id}
                            aria-pressed={options.selectedLandmark === item.id}
                            onClick={() =>
                              setOptions((current) => ({
                                ...current,
                                selectedLandmark: item.id,
                                labels: true,
                              }))
                            }
                          >
                            <strong>{russianName(item) || item.name}</strong>
                            <i>{latinName(item)}</i>
                          </button>
                        ))}
                      </div>
                      {!landmarks.length && (
                        <p className="body-source-note">
                          В этой группе нет пространственных меток источника. В
                          атласе черепа также доступен расширенный список
                          структур.
                        </p>
                      )}
                    </>
                  )}
                  {mode === "notes" && (
                    <div className="body-note">
                      <h3>Структура в конспекте</h3>
                      <p>
                        {bodyName(selected)} · <i>{latinName(selected)}</i>.{" "}
                        {
                          bodyRegions.find(
                            (region) => region.id === selected.region,
                          )?.name
                        }
                        .
                      </p>
                      {selected.kind === "bone" &&
                        (["muscle", "ligament"] as BodyZone[]).map((zone) => {
                          const attachments = manifest.parts.filter(
                            (part) =>
                              part.parent === selected.id && part.zone === zone,
                          );
                          return (
                            attachments.length > 0 && (
                              <details key={zone} open>
                                <summary>
                                  {zoneNames[zone]} · исходные участки
                                </summary>
                                <ul>
                                  {attachments.map((part) => (
                                    <li key={part.id}>
                                      {russianName(part) || part.name} ·{" "}
                                      <i>{latinName(part)}</i>
                                    </li>
                                  ))}
                                </ul>
                              </details>
                            )
                          );
                        })}
                      <p className="body-source-note">
                        Поверните модель, выберите ориентир или включите нужную
                        группу зон. Этот конспект перечисляет только сведения
                        исходного набора; список прикреплений неполный.
                      </p>
                      <label htmlFor="anatomy-note">Мой конспект</label>
                      <textarea
                        id="anatomy-note"
                        value={study.notes[selected.id] || ""}
                        onChange={(event) =>
                          setStudy((current) => ({
                            ...current,
                            notes: {
                              ...current.notes,
                              [selected.id]: event.target.value,
                            },
                          }))
                        }
                        placeholder="Строение, ориентиры, прикрепления, вопросы для повторения…"
                      />
                      <small>
                        Сохраняется на этом устройстве. Ракурс и зоны можно
                        изучать в 3D и сохранить изображением.
                      </small>
                      <button className="button secondary" onClick={exportNote}>
                        Скачать конспект .md
                      </button>
                    </div>
                  )}
                  <p className="body-source-note">
                    Z-Anatomy · CC BY-SA 4.0
                    {selected.ta2 ? ` · TA2 № ${selected.ta2}` : ""} ·{" "}
                    <a href="#/sources">Источники и метод разметки</a>
                  </p>
                </article>
              )}
              {!selected && mode === "notes" && (
                <p className="body-source-note">
                  Выберите структуру в каталоге или на модели, чтобы открыть её
                  3D-конспект.
                </p>
              )}
            </div>
            <aside className="body-catalog">
              <label className="body-search">
                <Search size={16} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Русское / латинское название"
                  aria-label="Поиск анатомической структуры"
                />
              </label>
              <p>{catalog.length} объектов модели</p>
              <div className="body-catalog-list">
                {catalog.map((part) => (
                  <button
                    key={part.id}
                    aria-pressed={selected?.id === part.id}
                    onClick={() => isolate(part.id)}
                  >
                    <strong>{bodyName(part)}</strong>
                    <i>{latinName(part) || part.name}</i>
                  </button>
                ))}
              </div>
              {!catalog.length && (
                <p>Ничего не найдено. Выберите другую область.</p>
              )}
            </aside>
          </div>
        </>
      )}
      {(mode === "cards" || mode === "test") && !learning && !finished && (
        <div className="body-study-start">
          <h2>
            {mode === "cards"
              ? "Запоминайте по настоящей модели"
              : "Узнайте структуру в 3D"}
          </h2>
          <p>
            Вращайте изолированную кость, мышцу или связку. В подборке{" "}
            {pool.length} двуязычных терминов выбранного раздела и области.
          </p>
          <label>
            Направление
            <select
              aria-label="Направление"
              value={direction}
              onChange={(event) =>
                setDirection(event.target.value as StudyDirection)
              }
            >
              <option value="ru-la">Русский → латынь</option>
              <option value="la-ru">Латынь → русский</option>
              {mode === "test" && (
                <option value="model-ru">Узнать по 3D-модели</option>
              )}
            </select>
          </label>
          <button
            className="button primary"
            disabled={pool.length < (mode === "cards" ? 1 : 4)}
            onClick={() => (mode === "cards" ? startCards() : startQuiz())}
          >
            {mode === "cards" ? "Начать карточки" : "Начать 3D-тест"}
          </button>
          {pool.length < (mode === "cards" ? 1 : 4) && (
            <p>
              В этой подборке недостаточно двуязычных терминов. Выберите более
              широкую область.
            </p>
          )}
          <p className="body-source-note">
            Вопросы используют только термины с русским и латинским названием.
            Объекты без перевода исключены.
          </p>
        </div>
      )}
      {mode === "cards" && card && (
        <div className="body-study">
          <div className="body-study-heading">
            <span>
              Карточка {cardIndex + 1} / {cardIds.length}
            </span>
            <button className="text-button" onClick={() => setCardIds([])}>
              Изменить подборку
            </button>
          </div>
          <BodyViewer
            options={options}
            setOptions={setOptions}
            manifest={manifest}
            conceal
            compact
          />
          <article className="body-flashcard">
            <small>
              {direction === "ru-la"
                ? "Переведите на латынь"
                : "Переведите на русский"}
            </small>
            <h2>
              {direction === "ru-la" ? russianName(card) : latinName(card)}
            </h2>
            {flipped ? (
              <p className="body-card-answer">
                {direction === "ru-la" ? latinName(card) : russianName(card)}
              </p>
            ) : (
              <button
                className="button primary"
                onClick={() => setFlipped(true)}
              >
                Показать ответ
              </button>
            )}
            <div className="body-card-controls">
              <button
                className="button secondary"
                onClick={() => nextCard(-1)}
                aria-label="Предыдущая карточка"
              >
                <ChevronLeft size={17} />
              </button>
              <button
                className="button secondary"
                aria-pressed={study.known.includes(card.id)}
                onClick={() =>
                  setStudy((current) => ({
                    ...current,
                    known: current.known.includes(card.id)
                      ? current.known.filter((id) => id !== card.id)
                      : [...current.known, card.id],
                  }))
                }
              >
                <Check size={16} />
                {study.known.includes(card.id) ? "Выучено" : "Знаю"}
              </button>
              <button
                className="button secondary"
                onClick={() => nextCard(1)}
                aria-label="Следующая карточка"
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </article>
        </div>
      )}
      {mode === "test" && question && !finished && (
        <div className="body-study">
          <div className="body-study-heading">
            <span>
              Вопрос {questionIndex + 1} / {questions.length}
            </span>
            <button className="text-button" onClick={() => setQuestions([])}>
              Завершить
            </button>
          </div>
          <BodyViewer
            options={options}
            setOptions={setOptions}
            manifest={manifest}
            conceal
            compact
          />
          <article className="body-question">
            <h2>{question.prompt}</h2>
            <div className="body-answers">
              {question.options.map((item) => (
                <button
                  key={item.id}
                  disabled={!!answer}
                  className={
                    answer
                      ? item.id === question.correctId
                        ? "correct"
                        : item.id === answer
                          ? "incorrect"
                          : ""
                      : ""
                  }
                  onClick={() => setAnswers((current) => [...current, item.id])}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {answer && (
              <div role="status">
                <p>
                  {answer === question.correctId ? "Верно" : "Правильный ответ"}
                  : <strong>{russianName(question.part)}</strong> ·{" "}
                  <i>{latinName(question.part)}</i>
                </p>
                <button className="button primary" onClick={nextQuestion}>
                  {questionIndex + 1 === questions.length
                    ? "Результат"
                    : "Следующий вопрос"}
                </button>
              </div>
            )}
          </article>
        </div>
      )}
      {mode === "test" && finished && (
        <div className="body-study-start">
          <h2>
            Результат:{" "}
            {
              questions.filter(
                (item, index) => item.correctId === answers[index],
              ).length
            }{" "}
            / {questions.length}
          </h2>
          <p>Результат сохранён на этом устройстве.</p>
          <button
            className="button primary"
            onClick={() => {
              setQuestions([]);
              setFinished(false);
            }}
          >
            Новый тест
          </button>
          <div className="body-result-list">
            {questions
              .filter((item, index) => item.correctId !== answers[index])
              .map((item) => (
                <p key={item.id}>
                  {russianName(item.part)} · <i>{latinName(item.part)}</i>
                </p>
              ))}
          </div>
          {questions.filter((item, index) => item.correctId !== answers[index])
            .length >= 4 && (
            <button
              className="button secondary"
              onClick={() =>
                startQuiz(
                  questions
                    .filter((item, index) => item.correctId !== answers[index])
                    .map((item) => item.part.id),
                )
              }
            >
              Повторить ошибки
            </button>
          )}
        </div>
      )}
      {mode === "test" && !questions.length && study.history.length > 0 && (
        <div className="body-study-start">
          <h3>Последние результаты</h3>
          {study.history.slice(0, 5).map((record, index) => (
            <p key={index}>
              {new Date(record.date).toLocaleDateString("ru-RU")} ·{" "}
              {record.score} / {record.total} ·{" "}
              {record.direction === "ru-la"
                ? "Русский → латынь"
                : record.direction === "la-ru"
                  ? "Латынь → русский"
                  : "Распознавание в 3D"}
            </p>
          ))}
        </div>
      )}
      <p className="body-source-note">
        Модель содержит {manifest.counts.bone} объектов костей,{" "}
        {manifest.counts.muscle} объектов мышц и {manifest.counts.ligament}{" "}
        объектов связок; части и стороны считаются отдельно. Это не число
        отдельных костей или мышц человека. Доступно {manifest.landmarks.length}{" "}
        пространственных ориентиров; покрытие зон прикрепления неполное.
      </p>
    </section>
  );
}
