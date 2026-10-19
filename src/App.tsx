import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bookmark,
  Box,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  GraduationCap,
  Layers3,
  Maximize2,
  RotateCcw,
  Search,
  ShieldCheck,
  Skull,
  Sparkles,
  Target,
  Trophy,
  X,
} from "lucide-react";
import {
  bones,
  departments,
  getBone,
  matchesBone,
  normalize,
  sourceList,
  totalBones,
  totalStructures,
  type Bone,
} from "./data/anatomy";
import { BoneGlyph, SkullMap, type SkullView } from "./components/SkullMap";
import { AnnotatedFigure } from "./components/AnnotatedFigure";
import { additionalProjections, plates } from "./data/projections";
import SkullViewer from "./components/SkullViewer";
import {
  createQuiz,
  makeMistakeQuiz,
  scopeLabel,
  type Question,
  type QuizConfig,
} from "./lib/quiz";
import {
  emptyProgress,
  readProgress,
  recordResult,
  saveProgress,
  type Progress,
  type QuizResult,
} from "./lib/storage";
import { getTelegram, haptic, initializeTelegram } from "./lib/telegram";

type Page = "atlas" | "model" | "practice" | "progress" | "sources";
const nav: { id: Page; label: string; icon: typeof BookOpen }[] = [
  { id: "atlas", label: "Атлас", icon: BookOpen },
  { id: "model", label: "3D-череп", icon: Box },
  { id: "practice", label: "Практика", icon: GraduationCap },
  { id: "progress", label: "Мой прогресс", icon: Target },
  { id: "sources", label: "Источники", icon: Layers3 },
];
const asset = (name: string) =>
  `${import.meta.env.BASE_URL}illustrations/${name}`;
const go = (path: string) => {
  window.location.hash = `/${path}`;
};

function useRoute() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const listener = () => {
      setHash(window.location.hash);
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", listener);
    return () => window.removeEventListener("hashchange", listener);
  }, []);
  const path = hash.replace(/^#\/?/, "").split("/");
  return {
    page: (nav.some((n) => n.id === path[0]) ? path[0] : "atlas") as Page,
    bone: path[0] === "bone" ? getBone(path[1]) : undefined,
    invalid: path[0] === "bone" && !getBone(path[1]),
    side:
      path[2] === "left" || path[2] === "right"
        ? (path[2] as "left" | "right")
        : undefined,
  };
}

export default function App() {
  const route = useRoute();
  const [progress, setProgress] = useState<Progress>(readProgress);
  const [storageOk, setStorageOk] = useState(true);
  const [practiceScope, setPracticeScope] = useState("all");
  const [reviewMistakes, setReviewMistakes] = useState(false);
  const update = (fn: (p: Progress) => Progress) =>
    setProgress((previous) => fn(previous));
  useEffect(() => {
    setStorageOk(saveProgress(progress));
  }, [progress]);
  useEffect(() => {
    initializeTelegram();
    const script = document.querySelector('script[src*="telegram-web-app.js"]');
    script?.addEventListener("load", initializeTelegram);
    return () => script?.removeEventListener("load", initializeTelegram);
  }, []);
  useEffect(() => {
    const back = getTelegram()?.BackButton;
    const handler = () => go("atlas");
    if (route.bone || route.page !== "atlas") {
      back?.show();
      back?.onClick(handler);
    } else back?.hide();
    return () => back?.offClick(handler);
  }, [route.bone, route.page]);
  const bookmark = (id: string) => {
    haptic();
    update((p) => ({
      ...p,
      bookmarks: p.bookmarks.includes(id)
        ? p.bookmarks.filter((x) => x !== id)
        : [...p.bookmarks, id],
    }));
  };
  const practice = (scope = "all", mistakes = false) => {
    setPracticeScope(scope);
    setReviewMistakes(mistakes);
    go("practice");
  };
  const onResult = (r: QuizResult, answered: string[]) =>
    update((p) => recordResult(p, r, answered));
  const active = route.bone ? "atlas" : route.page;

  return (
    <div className="app-shell">
      <a
        href="#main"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main")?.focus();
          document.getElementById("main")?.scrollIntoView();
        }}
      >
        К содержимому
      </a>
      <aside className="sidebar">
        <a className="brand" href="#/atlas" aria-label="Cranium — главная">
          <span className="brand-icon">
            <Skull size={25} strokeWidth={1.5} />
          </span>
          <span>
            Cranium<span className="brand-sub">АНАТОМИЧЕСКИЙ АТЛАС</span>
          </span>
        </a>
        <div className="sidebar-label">ПРОСТРАНСТВО ЗНАНИЙ</div>
        <nav aria-label="Основная навигация">
          {nav.map((n) => (
            <a
              key={n.id}
              href={`#/${n.id}`}
              className={`nav-item ${active === n.id ? "active" : ""}`}
              aria-current={active === n.id ? "page" : undefined}
            >
              <n.icon size={20} strokeWidth={1.6} />
              <span>{n.label}</span>
              {active === n.id && <span className="nav-dot" />}
            </a>
          ))}
        </nav>
        <div className="sidebar-note">
          <div className="note-icon">
            <Sparkles size={19} />
          </div>
          <strong>От целого к деталям</strong>
          <p>Изучайте кости, разбирайте структуры и закрепляйте знания.</p>
          <button className="text-button" onClick={() => practice()}>
            Перейти к практике <ArrowRight size={15} />
          </button>
        </div>
        <div className="sidebar-footer">
          <span className="status-dot" />
          Учебная версия <span>0.1</span>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Библиотека</span>
            <ChevronRight size={14} />
            <strong>
              {route.bone
                ? route.bone.name
                : nav.find((n) => n.id === active)?.label}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="desktop-only">АНАТОМИЯ ЧЕЛОВЕКА</span>
            <span className="edition">RU / LAT</span>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          {!storageOk && (
            <div role="status" className="storage-note">
              Хранилище недоступно. Прогресс сохранится только до закрытия
              приложения.
            </div>
          )}
          {route.invalid ? (
            <Empty
              icon={<Search />}
              title="Кость не найдена"
              description="Откройте нужную кость из атласа."
            >
              <button className="button primary" onClick={() => go("atlas")}>
                Открыть атлас
              </button>
            </Empty>
          ) : route.bone ? (
            <BoneDetail
              key={`${route.bone.id}:${route.side || "left"}`}
              bone={route.bone}
              side={route.side}
              saved={progress.bookmarks.includes(route.bone.id)}
              studied={progress.studied.includes(route.bone.id)}
              bookmark={() => bookmark(route.bone!.id)}
              onStudy={() =>
                update((p) => ({
                  ...p,
                  studied: p.studied.includes(route.bone!.id)
                    ? p.studied.filter((x) => x !== route.bone!.id)
                    : [...p.studied, route.bone!.id],
                }))
              }
              practice={() => practice(route.bone!.id)}
            />
          ) : route.page === "atlas" ? (
            <Atlas progress={progress} bookmark={bookmark} />
          ) : route.page === "model" ? (
            <>
              <PageTitle
                eyebrow="АНАТОМИЯ В ОБЪЁМЕ"
                title="Череп. Со всех сторон."
                text="Вращайте модель, разбирайте её на отдельные кости и изучайте внутренние поверхности. Выберите кость на модели или в списке."
              />
              <SkullViewer
                onOpen={(id, side) => go(`bone/${id}${side ? `/${side}` : ""}`)}
              />
            </>
          ) : route.page === "practice" ? (
            <Practice
              key={`${practiceScope}:${reviewMistakes}`}
              scope={practiceScope}
              mistakes={reviewMistakes ? progress.mistakes : undefined}
              onResult={onResult}
            />
          ) : route.page === "progress" ? (
            <ProgressPage
              progress={progress}
              practice={practice}
              reset={() => update(() => emptyProgress())}
            />
          ) : (
            <Sources />
          )}
        </main>
        <footer className="page-footer">
          <span>
            Cranium <span className="footer-dot">·</span> Знание начинается с
            любопытства
          </span>
          <a href="#/sources">
            Источники и лицензии <ExternalLink size={12} />
          </a>
        </footer>
      </div>
      <nav className="mobile-nav" aria-label="Мобильная навигация">
        {nav.map((n) => (
          <a
            key={n.id}
            href={`#/${n.id}`}
            className={active === n.id ? "active" : ""}
          >
            <n.icon size={21} />
            <span>{n.id === "progress" ? "Прогресс" : n.label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}

function Atlas({
  progress,
  bookmark,
}: {
  progress: Progress;
  bookmark: (id: string) => void;
}) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<SkullView>("front");
  const [heroMode, setHeroMode] = useState<"3d" | "scheme">("3d");
  const displayed = bones.filter(
    (b) =>
      (filter === "all" ||
        filter === b.department ||
        (filter === "saved" && progress.bookmarks.includes(b.id))) &&
      matchesBone(b, query),
  );
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <span />
            ОСТЕОЛОГИЯ · ЧЕРЕП ЧЕЛОВЕКА
          </span>
          <h1>
            Всё начинается
            <br />с <em>основы.</em>
          </h1>
          <p>
            От общей картины — к каждой детали.
            <br className="desktop-only" /> Изучайте анатомию черепа в своём
            темпе.
          </p>
          <button
            className="button primary"
            onClick={() =>
              document
                .getElementById("bone-catalogue")
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
          >
            Исследовать атлас <ArrowDown size={16} />
          </button>
          <div className="hero-footnote">
            <ShieldCheck size={14} /> На основе медицинских учебных источников
          </div>
        </div>
        <div className={`hero-visual ${heroMode === "3d" ? "hero-3d" : ""}`}>
          <div className="hero-mode-tabs">
            <button
              className={heroMode === "3d" ? "selected" : ""}
              aria-pressed={heroMode === "3d"}
              onClick={() => setHeroMode("3d")}
            >
              <Box size={12} />
              3D-модель
            </button>
            <button
              className={heroMode === "scheme" ? "selected" : ""}
              aria-pressed={heroMode === "scheme"}
              onClick={() => setHeroMode("scheme")}
            >
              Схема
            </button>
          </div>
          {heroMode === "3d" ? (
            <SkullViewer
              compact
              onOpen={(id, side) =>
                go(id ? `bone/${id}${side ? `/${side}` : ""}` : "model")
              }
            />
          ) : (
            <>
              <div className="hero-drawing">
                <SkullMap view={view} onSelect={(id) => go(`bone/${id}`)} />
              </div>
              <div className="view-switch" aria-label="Проекция схемы">
                {(
                  [
                    ["front", "Спереди"],
                    ["side", "Сбоку"],
                    ["base", "Снизу"],
                  ] as const
                ).map(([id, name]) => (
                  <button
                    key={id}
                    className={view === id ? "selected" : ""}
                    aria-pressed={view === id}
                    onClick={() => setView(id)}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <span className="scheme-caption">Схема навигации</span>
            </>
          )}
        </div>
      </section>
      <section className="stats-strip" aria-label="Состав атласа">
        <Stat
          number={String(totalBones)}
          label="кости черепа"
          detail="8 мозговых · 14 лицевых"
          icon={<Skull />}
        />
        <Stat
          number="14"
          label="типов костей"
          detail="парные и непарные"
          icon={<Layers3 />}
        />
        <Stat
          number={String(totalStructures)}
          label="структур"
          detail="названия на русском и латыни"
          icon={<BookOpen />}
        />
        <Stat
          number={String(progress.studied.length).padStart(2, "0")}
          label="изучено вами"
          detail="продолжайте в своём темпе"
          icon={<Target />}
        />
      </section>
      <section id="bone-catalogue" className="catalogue">
        <div className="section-heading">
          <div>
            <div className="eyebrow">ВАШ АНАТОМИЧЕСКИЙ ПУТЕВОДИТЕЛЬ</div>
            <h2>Атлас костей</h2>
          </div>
          <span className="count-badge">
            {displayed.length} из {bones.length}
          </span>
        </div>
        <div className="catalogue-tools">
          <div className="filter-tabs" aria-label="Отдел черепа">
            {[
              ["all", "Все кости"],
              ["cranial", "Мозговой отдел"],
              ["facial", "Лицевой отдел"],
              ["saved", "Избранное"],
            ].map(([id, name]) => (
              <button
                key={id}
                onClick={() => setFilter(id)}
                aria-pressed={filter === id}
                className={filter === id ? "selected" : ""}
              >
                {id === "saved" && <Bookmark size={14} />}
                {name}
              </button>
            ))}
          </div>
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Кость или структура…"
            label="Поиск по атласу"
          />
        </div>
        {query && (
          <p className="search-summary" aria-live="polite">
            По запросу «{query}» найдено костей: {displayed.length}. Поиск
            включает анатомические структуры.
          </p>
        )}
        {displayed.length ? (
          <div className="bone-grid">
            {displayed.map((b, i) => (
              <BoneCard
                key={b.id}
                bone={b}
                index={i + 1}
                saved={progress.bookmarks.includes(b.id)}
                studied={progress.studied.includes(b.id)}
                bookmark={() => bookmark(b.id)}
              />
            ))}
          </div>
        ) : (
          <Empty
            icon={<Search />}
            title={
              filter === "saved" && !query
                ? "Здесь будут ваши кости"
                : "Ничего не найдено"
            }
            description={
              filter === "saved" && !query
                ? "Нажмите на закладку в карточке, чтобы вернуться к кости позже."
                : "Попробуйте русское или латинское название. Например, «решётчатая» или «foramen»."
            }
          >
            <button
              className="button secondary"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
            >
              Показать все кости
            </button>
          </Empty>
        )}
      </section>
      <section className="practice-banner">
        <div className="banner-icon">
          <GraduationCap size={29} strokeWidth={1.5} />
        </div>
        <div>
          <span className="eyebrow">ЗНАНИЯ СТАНОВЯТСЯ НАВЫКОМ</span>
          <h3>Изучили? Проверьте себя.</h3>
          <p>Термины, строение и разбор каждого ответа.</p>
        </div>
        <button className="button primary" onClick={() => go("practice")}>
          Начать практику <ArrowRight size={16} />
        </button>
      </section>
    </>
  );
}

function BoneCard({
  bone: b,
  index,
  saved,
  studied,
  bookmark,
}: {
  bone: Bone;
  index: number;
  saved: boolean;
  studied: boolean;
  bookmark: () => void;
}) {
  return (
    <article className="bone-card">
      <button
        className="bone-card-main"
        aria-label={`Открыть: ${b.name}`}
        onClick={() => go(`bone/${b.id}`)}
      >
        <div className="card-top">
          <span className="card-index">{String(index).padStart(2, "0")}</span>
          <BoneGlyph id={b.id} color={b.color} />
        </div>
        <div className={`department-label ${b.department}`}>
          <span />
          {departments[b.department]}
        </div>
        <h3>{b.name}</h3>
        <span className="latin">{b.latin}</span>
        <div className="card-bottom">
          <span>
            {b.structures.length} структур <span>·</span>{" "}
            {b.paired ? "парная" : "непарная"}
          </span>
          {studied ? (
            <CheckCircle2
              size={17}
              className="studied-icon"
              aria-label="Изучена"
            />
          ) : (
            <ArrowRight size={17} />
          )}
        </div>
      </button>
      <button
        className={`bookmark-button ${saved ? "saved" : ""}`}
        onClick={bookmark}
        aria-label={`${saved ? "Убрать из избранного" : "В избранное"}: ${b.name}`}
        aria-pressed={saved}
      >
        <Bookmark size={17} fill={saved ? "currentColor" : "none"} />
      </button>
    </article>
  );
}

function BoneDetail({
  bone: b,
  side,
  saved,
  studied,
  bookmark,
  onStudy,
  practice,
}: {
  bone: Bone;
  side?: "left" | "right";
  saved: boolean;
  studied: boolean;
  bookmark: () => void;
  onStudy: () => void;
  practice: () => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [plate, setPlate] = useState(b.illustration);
  const [viewMode, setViewMode] = useState<"3d" | "plate">("3d");
  const dialog = useRef<HTMLDialogElement>(null);
  const filtered = b.structures.filter(
    (s) =>
      (category === "all" || s.category === category) &&
      normalize(`${s.name} ${s.latin} ${s.note}`).includes(normalize(query)),
  );
  const isolated = plates[plate].isolated;
  return (
    <div className="detail-page" key={b.id}>
      <button className="text-button back-link" onClick={() => go("atlas")}>
        <ArrowLeft size={16} /> Все кости
      </button>
      <div className="detail-title">
        <div>
          <div className={`department-label ${b.department}`}>
            <span />
            {departments[b.department]}{" "}
            <span className="small-separator">/</span>{" "}
            {b.paired ? "Парная кость" : "Непарная кость"}
          </div>
          <h1>{b.name}</h1>
          <p className="detail-latin">{b.latin}</p>
        </div>
        <button
          className={`button secondary icon-text ${saved ? "is-saved" : ""}`}
          aria-pressed={saved}
          onClick={bookmark}
        >
          <Bookmark size={17} fill={saved ? "currentColor" : "none"} />
          {saved ? "В избранном" : "Сохранить"}
        </button>
      </div>
      <div className="detail-layout">
        <div className="detail-visual">
          <div className="bone-view-mode">
            <button
              className={viewMode === "3d" ? "selected" : ""}
              aria-pressed={viewMode === "3d"}
              onClick={() => setViewMode("3d")}
            >
              <Box size={14} />
              3D-модель
            </button>
            <button
              className={viewMode === "plate" ? "selected" : ""}
              aria-pressed={viewMode === "plate"}
              onClick={() => setViewMode("plate")}
            >
              <BookOpen size={14} />
              Иллюстрации OpenStax
            </button>
          </div>
          {viewMode === "3d" ? (
            <>
              <SkullViewer
                boneId={b.id}
                side={side}
                structureId={expanded}
                onStructureSelect={setExpanded}
              />
              {expanded && (
                <div className="selected-annotation">
                  <strong>
                    {b.structures.find((s) => s.id === expanded)?.name}
                  </strong>
                  <span lang="la">
                    {b.structures.find((s) => s.id === expanded)?.latin}
                  </span>
                  <p>{b.structures.find((s) => s.id === expanded)?.note}</p>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="viewer-heading">
                <span>
                  {isolated ? "Изолированная кость" : "Положение в черепе"}
                </span>
                <button
                  className="icon-button"
                  onClick={() => dialog.current?.showModal()}
                  aria-label="Увеличить анатомическую иллюстрацию"
                >
                  <Maximize2 size={17} />
                </button>
              </div>
              <div
                className="projection-tabs"
                aria-label="Анатомические проекции"
              >
                {[b.illustration, ...additionalProjections[b.id]].map(
                  (file) => (
                    <button
                      key={file}
                      aria-pressed={plate === file}
                      className={plate === file ? "selected" : ""}
                      onClick={() => setPlate(file)}
                    >
                      {plates[file].label}
                    </button>
                  ),
                )}
              </div>
              <AnnotatedFigure
                key={plate}
                bone={b}
                file={plate}
                selected={expanded}
                select={setExpanded}
              />
              <div className="image-caption">
                OpenStax · {plates[plate].title}
                <br />
                <a href="#/sources">
                  Оригинальная иллюстрация · CC BY-NC-SA 4.0
                </a>
              </div>
            </>
          )}
          <div className="visual-note">
            <BookOpen size={17} />
            <p>
              Список ниже содержит все включённые структуры кости. Метки 92
              ориентиров доступны в 3D, дополнительные — на основных
              иллюстрациях OpenStax. Структуры без пространственной метки
              остаются в списке.
            </p>
          </div>
        </div>
        <div className="bone-overview">
          <span className="eyebrow">КОРОТКО О КОСТИ</span>
          <h2>Форма и функция</h2>
          <p>{b.summary}</p>
          <div className="bone-facts">
            <div>
              <strong>{b.paired ? "02" : "01"}</strong>
              <span>{b.paired ? "Правая и левая" : "Непарная кость"}</span>
            </div>
            <div>
              <strong>{b.structures.length}</strong>
              <span>Структур в атласе</span>
            </div>
          </div>
          <h3>Соединяется с костями</h3>
          <div className="articulation-chips">
            {b.articulations.map((id) => {
              const other = getBone(id)!;
              return (
                <button key={id} onClick={() => go(`bone/${id}`)}>
                  {other.name}
                  <ArrowRight size={12} />
                </button>
              );
            })}
          </div>
          <button className="button primary full-width" onClick={practice}>
            Тест по этой кости <GraduationCap size={17} />
          </button>
          <button
            className={`button secondary full-width ${studied ? "is-studied" : ""}`}
            onClick={onStudy}
            aria-pressed={studied}
          >
            {studied ? <CheckCircle2 size={17} /> : <Check size={17} />}
            {studied ? "Изучено — снять отметку" : "Отметить как изученную"}
          </button>
        </div>
      </div>
      <section className="structures-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">АНАТОМИЧЕСКИЕ ОРИЕНТИРЫ</div>
            <h2>Структуры кости</h2>
          </div>
          <span className="count-badge">{b.structures.length}</span>
        </div>
        <p className="section-intro">
          Части, поверхности, отростки и отверстия. Нажмите на структуру, чтобы
          раскрыть пояснение.
        </p>
        <div className="structure-tools">
          <label className="select-wrap">
            <span className="sr-only">Категория структур</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="all">Все структуры</option>
              {[...new Set(b.structures.map((s) => s.category))].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <ChevronDown size={15} />
          </label>
          <SearchField
            value={query}
            onChange={setQuery}
            label="Поиск структур кости"
            placeholder="Найти структуру…"
          />
        </div>
        <div className="structures-list">
          {filtered.map((s) => {
            const open = expanded === s.id;
            return (
              <div
                className={`structure-row ${open ? "expanded" : ""}`}
                key={s.id}
              >
                <button
                  aria-expanded={open}
                  aria-controls={`explanation-${s.id}`}
                  onClick={() => setExpanded(open ? null : s.id)}
                >
                  <span className="structure-number">
                    {String(b.structures.indexOf(s) + 1).padStart(2, "0")}
                  </span>
                  <span className="structure-name">
                    <strong>{s.name}</strong>
                    <span lang="la">{s.latin}</span>
                  </span>
                  <span className="structure-category">{s.category}</span>
                  <ChevronDown size={16} />
                </button>
                {open && (
                  <div
                    className="structure-explanation"
                    id={`explanation-${s.id}`}
                  >
                    <p>{s.note}</p>
                    <span>
                      Номенклатура: FIPAT · <a href="#/sources">Источники</a>
                    </span>
                  </div>
                )}
              </div>
            );
          })}
          {!filtered.length && (
            <Empty
              icon={<Search />}
              title="Структуры не найдены"
              description="Измените запрос или категорию."
            >
              <button
                className="button secondary"
                onClick={() => {
                  setCategory("all");
                  setQuery("");
                }}
              >
                Сбросить поиск
              </button>
            </Empty>
          )}
        </div>
      </section>
      <dialog
        ref={dialog}
        className="image-dialog"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close();
        }}
      >
        <div className="dialog-top">
          <strong>{b.name} · OpenStax</strong>
          <button
            className="icon-button"
            onClick={() => dialog.current?.close()}
            aria-label="Закрыть иллюстрацию"
          >
            <X />
          </button>
        </div>
        <img src={asset(plate)} alt={`Увеличенная иллюстрация: ${b.name}`} />
        <p>Оригинальные подписи OpenStax на английском · CC BY-NC-SA 4.0</p>
      </dialog>
    </div>
  );
}

function Practice({
  scope,
  mistakes,
  onResult,
}: {
  scope: string;
  mistakes?: string[];
  onResult: (result: QuizResult, ids: string[]) => void;
}) {
  const [config, setConfig] = useState<QuizConfig>({
    scope,
    mode: "mixed",
    count: 10,
  });
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [finished, setFinished] = useState(false);
  const [isReview, setIsReview] = useState(false);
  const completed = useRef(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (questions) titleRef.current?.focus();
  }, [index, questions, finished]);
  const begin = (review = false) => {
    const qs = review ? makeMistakeQuiz(mistakes || []) : createQuiz(config);
    if (!qs.length) return;
    setIsReview(review);
    setQuestions(qs);
    setIndex(0);
    setAnswers({});
    setFinished(false);
    completed.current = false;
    haptic();
  };
  function finish() {
    if (!questions || completed.current) return;
    completed.current = true;
    const missed = questions
      .filter((q) => answers[q.id] !== q.answer)
      .map((q) => q.id);
    onResult(
      {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        total: questions.length,
        correct: questions.length - missed.length,
        scope: isReview ? "mistakes" : config.scope,
        mistakes: missed,
      },
      questions.map((q) => q.id),
    );
    setFinished(true);
  }
  if (!questions)
    return (
      <div className="practice-page">
        <PageTitle
          eyebrow="АКТИВНОЕ ВСПОМИНАНИЕ"
          title="Знания в действии"
          text="Выберите тему и формат. После каждого ответа — пояснение, после теста — разбор ошибок."
        />
        <div className="practice-setup">
          <div className="quiz-config">
            <span className="numbered-label">
              <span>01</span>Что будем повторять?
            </span>
            <div className="scope-options">
              {[
                ["all", "Весь череп", "22 кости"],
                ["cranial", "Мозговой отдел", "8 костей"],
                ["facial", "Лицевой отдел", "14 костей"],
              ].map(([id, title, detail]) => (
                <button
                  key={id}
                  onClick={() => setConfig((c) => ({ ...c, scope: id }))}
                  className={config.scope === id ? "selected" : ""}
                  aria-pressed={config.scope === id}
                >
                  <Skull size={23} strokeWidth={1.3} />
                  <strong>{title}</strong>
                  <span>{detail}</span>
                  {config.scope === id && (
                    <CheckCircle2 size={15} className="scope-check" />
                  )}
                </button>
              ))}
            </div>
            <label className="field-label">
              Или отдельная кость
              <select
                value={
                  bones.some((b) => b.id === config.scope) ? config.scope : ""
                }
                onChange={(e) =>
                  setConfig((c) => ({ ...c, scope: e.target.value || "all" }))
                }
              >
                <option value="">Выбрать кость…</option>
                {bones.map((b) => (
                  <option value={b.id} key={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <span className="numbered-label">
              <span>02</span>Формат практики
            </span>
            <div className="format-options">
              {[
                ["mixed", "Смешанный", "Термины и распознавание костей"],
                ["terms", "Терминология", "Русское название → латинское"],
                ["bones", "Узнать кость", "Определить кость по описанию"],
              ].map(([id, title, detail]) => (
                <button
                  key={id}
                  onClick={() =>
                    setConfig((c) => ({ ...c, mode: id as QuizConfig["mode"] }))
                  }
                  className={config.mode === id ? "selected" : ""}
                  aria-pressed={config.mode === id}
                >
                  <span className="radio-mark" />
                  <span>
                    <strong>{title}</strong>
                    <small>{detail}</small>
                  </span>
                </button>
              ))}
            </div>
            <div className="quiz-length">
              <span className="numbered-label">
                <span>03</span>Количество вопросов
              </span>
              <div className="segmented">
                {[5, 10, 20].map((n) => (
                  <button
                    key={n}
                    className={config.count === n ? "selected" : ""}
                    aria-pressed={config.count === n}
                    onClick={() => setConfig((c) => ({ ...c, count: n }))}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <p className="subtle">
              Если в теме меньше вопросов, будут использованы все доступные.
            </p>
            <button
              className="button primary full-width"
              onClick={() => begin()}
            >
              Начать тест <ArrowRight size={17} />
            </button>
          </div>
          <aside className="practice-aside">
            <div className="large-line-icon">
              <GraduationCap size={58} strokeWidth={0.8} />
            </div>
            <h2>
              Вспоминать —<br />
              <em>значит запоминать.</em>
            </h2>
            <p>
              Отвечайте без подсказок. Ошибки помогут понять, к каким структурам
              стоит вернуться.
            </p>
            <div className="practice-benefit">
              <CheckCircle2 size={17} />
              Пояснение к каждому ответу
            </div>
            <div className="practice-benefit">
              <CheckCircle2 size={17} />
              Повторение трудных вопросов
            </div>
            <div className="practice-benefit">
              <CheckCircle2 size={17} />
              Прогресс на этом устройстве
            </div>
            {mistakes && (
              <div className="mistake-start">
                <strong>
                  {mistakes.length
                    ? `Вопросов для повторения: ${mistakes.length}`
                    : "Ошибок для повторения пока нет"}
                </strong>
                <button
                  className="button secondary full-width"
                  disabled={!mistakes.length}
                  onClick={() => begin(true)}
                >
                  Разобрать ошибки <RotateCcw size={15} />
                </button>
              </div>
            )}
          </aside>
        </div>
      </div>
    );
  if (finished) {
    const correct = questions.filter((q) => answers[q.id] === q.answer).length;
    const wrong = questions.filter((q) => answers[q.id] !== q.answer);
    return (
      <div className="quiz-page">
        <div className="result-hero">
          <span className="result-icon">
            <Trophy size={37} strokeWidth={1.3} />
          </span>
          <span className="eyebrow">ПРАКТИКА ЗАВЕРШЕНА</span>
          <h1 ref={titleRef} tabIndex={-1}>
            {correct === questions.length
              ? "Отличная работа."
              : "Ещё на шаг увереннее."}
          </h1>
          <p>
            {scopeLabel(config.scope)} · {questions.length} вопросов
          </p>
          <div className="result-score">
            <strong>{correct}</strong>
            <span>/ {questions.length}</span>
          </div>
          <p>
            Правильных ответов ·{" "}
            {Math.round((correct / questions.length) * 100)}%
          </p>
          <div className="result-actions">
            <button
              className="button primary"
              onClick={() => {
                setQuestions(null);
                setFinished(false);
              }}
            >
              Ещё один тест <RotateCcw size={16} />
            </button>
            <button className="button secondary" onClick={() => go("progress")}>
              Мой прогресс <ArrowRight size={16} />
            </button>
          </div>
        </div>
        <div className="section-heading">
          <h2>{wrong.length ? "Разбор ошибок" : "Все ответы верны"}</h2>
          <span className="count-badge">{wrong.length}</span>
        </div>
        {wrong.map((q) => (
          <div className="review-card" key={q.id}>
            <span className="eyebrow">{getBone(q.boneId)?.name}</span>
            <h3>{q.prompt}</h3>
            {q.kind === "bone" && <p>{q.context}</p>}
            <p className="wrong-text">Ваш ответ: {answers[q.id]}</p>
            <p className="correct-text">
              <Check size={16} />
              {q.answer}
            </p>
            <p>{q.explanation}</p>
            <button
              className="text-button"
              onClick={() => go(`bone/${q.boneId}`)}
            >
              Повторить в атласе <ArrowRight size={14} />
            </button>
          </div>
        ))}
      </div>
    );
  }
  const q = questions[index];
  const answered = answers[q.id];
  const correct = answered === q.answer;
  return (
    <div className="quiz-page">
      <button
        className="text-button back-link"
        onClick={() => {
          if (
            Object.keys(answers).length === 0 ||
            window.confirm(
              "Выйти из теста? Незавершённый результат не сохранится.",
            )
          )
            setQuestions(null);
        }}
      >
        <ArrowLeft size={16} /> Завершить позже
      </button>
      <div className="quiz-topline">
        <span>{isReview ? "Повторение ошибок" : scopeLabel(config.scope)}</span>
        <strong>
          Вопрос {index + 1} из {questions.length}
        </strong>
      </div>
      <div
        className="quiz-progress"
        role="progressbar"
        aria-label="Ход теста"
        aria-valuenow={index + (answered ? 1 : 0)}
        aria-valuemin={0}
        aria-valuemax={questions.length}
      >
        <span
          style={{
            width: `${((index + (answered ? 1 : 0)) / questions.length) * 100}%`,
          }}
        />
      </div>
      <div className="question-card">
        <span className="eyebrow">
          {q.kind === "term" ? "АНАТОМИЧЕСКАЯ ТЕРМИНОЛОГИЯ" : "СТРОЕНИЕ ЧЕРЕПА"}
        </span>
        <h1 ref={titleRef} tabIndex={-1}>
          {q.prompt}
        </h1>
        <p className="question-context">{q.context}</p>
        <div className="answer-options">
          {q.options.map((option, i) => (
            <button
              key={option}
              disabled={!!answered}
              className={`${answered && option === q.answer ? "correct" : ""} ${answered === option && !correct ? "incorrect" : ""}`}
              onClick={() => {
                setAnswers((a) => ({ ...a, [q.id]: option }));
                haptic(option === q.answer);
              }}
            >
              <span className="answer-letter">
                {String.fromCharCode(65 + i)}
              </span>
              <span lang={q.kind === "term" ? "la" : "ru"}>{option}</span>
              {answered && option === q.answer && <CheckCircle2 size={20} />}
              {answered === option && !correct && <X size={20} />}
            </button>
          ))}
        </div>
        {answered && (
          <div
            className={`answer-feedback ${correct ? "correct" : "incorrect"}`}
            role="status"
          >
            <strong>
              {correct ? "Верно. Так держать!" : "Разберёмся вместе."}
            </strong>
            <p>{q.explanation}</p>
            <a href="#/sources">
              FIPAT · OpenStax <ExternalLink size={12} />
            </a>
          </div>
        )}
        <button
          className="button primary full-width"
          disabled={!answered}
          onClick={() => {
            if (index === questions.length - 1) finish();
            else setIndex((i) => i + 1);
          }}
        >
          {index === questions.length - 1
            ? "Показать результат"
            : "Следующий вопрос"}
          <ArrowRight size={17} />
        </button>
      </div>
    </div>
  );
}

function ProgressPage({
  progress: p,
  practice,
  reset,
}: {
  progress: Progress;
  practice: (scope?: string, mistakes?: boolean) => void;
  reset: () => void;
}) {
  const total = p.history.reduce((s, r) => s + r.total, 0);
  const correct = p.history.reduce((s, r) => s + r.correct, 0);
  return (
    <>
      <PageTitle
        eyebrow="ВАШ ЛИЧНЫЙ МАРШРУТ"
        title="Каждая деталь — вперёд"
        text="Отмечайте изученные кости и возвращайтесь к трудным вопросам. Прогресс хранится в этом браузере и не синхронизируется между устройствами."
      />
      <section className="progress-stats">
        <Stat
          number={`${p.studied.length}/14`}
          label="типов костей изучено"
          detail="отметки в карточках атласа"
          icon={<BookOpen />}
        />
        <Stat
          number={String(p.history.length)}
          label="тестов завершено"
          detail="последние 30 результатов"
          icon={<GraduationCap />}
        />
        <Stat
          number={total ? `${Math.round((correct / total) * 100)}%` : "—"}
          label="точность ответов"
          detail={
            total
              ? `${correct} правильных из ${total}`
              : "появится после первого теста"
          }
          icon={<Target />}
        />
      </section>
      <div className="progress-layout">
        <section className="learning-list">
          <div className="section-heading">
            <h2>Карта изучения</h2>
            <span className="count-badge">
              {Math.round((p.studied.length / bones.length) * 100)}%
            </span>
          </div>
          {bones.map((b) => (
            <button
              className="learning-bone"
              key={b.id}
              onClick={() => go(`bone/${b.id}`)}
            >
              <span
                className={
                  p.studied.includes(b.id)
                    ? "learning-check done"
                    : "learning-check"
                }
              >
                {p.studied.includes(b.id) && <Check size={14} />}
              </span>
              <span>
                <strong>{b.name}</strong>
                <small>{b.latin}</small>
              </span>
              <ChevronRight size={16} />
            </button>
          ))}
        </section>
        <aside>
          <div className="repeat-card">
            <RotateCcw size={24} />
            <h2>Точки роста</h2>
            <p>
              {p.mistakes.length
                ? `${p.mistakes.length} вопросов ждут повторения. Верный ответ в следующем тесте уберёт вопрос из этого списка.`
                : "Ошибок для повторения пока нет. Завершите тест, чтобы увидеть, что стоит закрепить."}
            </p>
            <button
              className="button primary full-width"
              onClick={() => practice("all", p.mistakes.length > 0)}
            >
              {p.mistakes.length ? "Повторить ошибки" : "Пройти тест"}
              <ArrowRight size={16} />
            </button>
          </div>
          <div className="history-card">
            <h2>История практики</h2>
            {p.history.length ? (
              p.history.map((r) => (
                <div className="history-row" key={r.id}>
                  <div>
                    <strong>
                      {r.scope === "mistakes"
                        ? "Повторение ошибок"
                        : scopeLabel(r.scope)}
                    </strong>
                    <small>
                      {new Intl.DateTimeFormat("ru", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(r.date))}
                    </small>
                  </div>
                  <span
                    className={r.correct / r.total >= 0.8 ? "good-score" : ""}
                  >
                    {r.correct}/{r.total}
                  </span>
                </div>
              ))
            ) : (
              <p className="subtle">Здесь появятся завершённые тесты.</p>
            )}
          </div>
          <button
            className="text-button reset-button"
            onClick={() => {
              if (
                window.confirm(
                  "Удалить весь прогресс, избранное и историю на этом устройстве?",
                )
              )
                reset();
            }}
          >
            Сбросить локальный прогресс
          </button>
        </aside>
      </div>
    </>
  );
}

function Sources() {
  return (
    <>
      <PageTitle
        eyebrow="ПРОЗРАЧНАЯ ОСНОВА"
        title="У знаний есть источник"
        text="Анатомические названия, учебные пояснения и иллюстрации опираются на медицинскую номенклатуру и открытый университетский учебник."
      />
      <div className="source-intro">
        <ShieldCheck size={28} strokeWidth={1.3} />
        <div>
          <h2>Как устроен атлас</h2>
          <p>
            22 кости взрослого черепа: 8 мозгового и 14 лицевого отдела. Парные
            кости объединены в общие карточки — всего 14 типов. Слуховые
            косточки, подъязычная кость и добавочные шовные кости в этот счёт не
            входят.
          </p>
          <p>
            В карточках собраны основные именованные структуры; это учебная
            версия, а не исчерпывающий анатомический справочник. Вариабельные
            образования отмечены в пояснениях. Русские переводы терминов и
            пояснения — редакция приложения.
          </p>
        </div>
      </div>
      <div className="source-list">
        {sourceList.map((source, index) => (
          <a
            className="source-card"
            href={source.url}
            target="_blank"
            rel="noreferrer"
            key={source.id}
          >
            <span className="source-index">0{index + 1}</span>
            <div>
              <h3>{source.title}</h3>
              <p>{source.detail}</p>
              <span>{new URL(source.url).hostname}</span>
            </div>
            <ExternalLink size={19} />
          </a>
        ))}
      </div>
      <div className="license-card">
        <h2>Иллюстрации и условия использования</h2>
        <p>
          Изображения взяты из официального репозитория OpenStax, Rice
          University, без изменения оригинальных файлов. Авторство: OpenStax.
          Лицензия{" "}
          <a
            href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
            target="_blank"
            rel="noreferrer"
          >
            Creative Commons BY-NC-SA 4.0
          </a>
          : указание авторства, некоммерческое использование, распространение
          производных материалов на тех же условиях.
        </p>
        <p>
          Русские учебные пояснения и собственные навигационные схемы приложения
          распространяются на условиях CC BY-NC-SA 4.0. Исходный код — MIT.
          OpenStax и FIPAT не являются авторами или официальными партнёрами
          приложения.
        </p>
        <p>
          3D-геометрия BodyParts3D 4.0, © The Database Center for Life Science,
          предоставлена по{" "}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noreferrer"
          >
            CC BY 4.0
          </a>
          . В приложении сохранены отдельные кости, исходные вершины,
          треугольники и идентификаторы. Анимация разборки — учебная
          демонстрация сборки. Она не моделирует физиологические движения.
        </p>
        <p>
          В 3D подписаны все кости и 92 структуры; авторские метки Z-Anatomy
          адаптированы к модели BodyParts3D. Набор меток предоставлен по CC
          BY-SA 4.0. Для остальных 134 структур нет подтверждённых координат в
          исследованном наборе: они перечислены с пояснениями без вымышленных
          точек. Ещё 54 ориентира имеют маркеры на 2D-иллюстрациях.
          Геометрическое согласование моделей не заменяет экспертную проверку
          анатомических координат. Дополнительные SVG-схемы условны и служат
          навигации.
        </p>
        <a
          className="text-button"
          href={`${import.meta.env.BASE_URL}models/ATTRIBUTION.md`}
          target="_blank"
          rel="noreferrer"
        >
          Происхождение 3D-модели и лицензия <ExternalLink size={14} />
        </a>
        <a
          className="text-button"
          href={asset("provenance.json")}
          target="_blank"
          rel="noreferrer"
        >
          Происхождение и контрольные суммы изображений{" "}
          <ExternalLink size={14} />
        </a>
      </div>
      <div className="educational-note">
        <BookOpen size={20} />
        <p>
          Приложение предназначено для изучения анатомии. Оно не используется
          для диагностики и выбора лечения.
        </p>
      </div>
    </>
  );
}

function PageTitle({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div className="page-title">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{text}</p>
    </div>
  );
}
function Stat({
  number,
  label,
  detail,
  icon,
}: {
  number: string;
  label: string;
  detail: string;
  icon: ReactNode;
}) {
  return (
    <div className="stat">
      <div className="stat-top">
        <strong>{number}</strong>
        <span>{icon}</span>
      </div>
      <span className="stat-label">{label}</span>
      <small>{detail}</small>
    </div>
  );
}
function SearchField({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <div className="search-field">
      <Search size={17} />
      <input
        aria-label={label}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button
          className="icon-button"
          aria-label="Очистить поиск"
          onClick={() => onChange("")}
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
function Empty({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span>{icon}</span>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
