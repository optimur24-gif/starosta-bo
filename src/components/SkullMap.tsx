import { bones } from "../data/anatomy";

export type SkullView = "front" | "side" | "base";
const maps: Record<SkullView, Record<string, string[]>> = {
  front: {
    parietal: [
      "M52 100Q39 38 111 19L128 25L101 59Z",
      "M228 100Q241 38 169 19L152 25L179 59Z",
    ],
    frontal: [
      "M52 100Q48 25 140 20Q232 25 228 100L218 124Q183 101 154 122L140 132L126 122Q97 101 62 124Z",
    ],
    sphenoid: [
      "M60 129L81 126L87 155L70 178L52 159Z",
      "M220 129L199 126L193 155L210 178L228 159Z",
    ],
    ethmoid: ["M126 129L140 125L154 129L150 170L140 179L130 170Z"],
    nasal: ["M130 132L140 130L150 132L156 170L140 181L124 170Z"],
    lacrimal: [
      "M118 143L128 140L127 162L118 166Z",
      "M162 143L152 140L153 162L162 166Z",
    ],
    zygomatic: [
      "M54 157L72 168L90 171L89 194L69 209L47 195L42 177Z",
      "M226 157L208 168L190 171L191 194L211 209L233 195L238 177Z",
    ],
    maxilla: [
      "M89 178L124 169L136 181L125 210L135 227L134 251L80 245L73 218L88 201Z",
      "M191 178L156 169L144 181L155 210L145 227L146 251L200 245L207 218L192 201Z",
    ],
    concha: [
      "M119 191Q100 207 123 215L128 207Z",
      "M161 191Q180 207 157 215L152 207Z",
    ],
    vomer: ["M138 181L142 181L146 220L140 226L134 220Z"],
    mandible: [
      "M59 225L76 232L83 263Q140 281 197 263L204 232L221 225L216 281Q211 311 140 318Q69 311 64 281Z",
    ],
  },
  side: {
    parietal: ["M91 38Q178 1 232 63L242 134L183 153L136 118L112 73Z"],
    frontal: [
      "M91 38L112 73L113 111L76 146L47 142L41 117L58 107L57 81Q63 50 91 38Z",
    ],
    occipital: ["M232 63Q276 111 253 186L219 217L192 201L206 162L242 134Z"],
    temporal: [
      "M136 118L183 153L242 134L206 162L192 201L169 220L155 201L130 195L101 176L112 155Z",
    ],
    sphenoid: ["M113 111L136 118L112 155L102 168L86 147Z"],
    nasal: ["M47 142L61 145L59 166L34 182L27 177Z"],
    zygomatic: [
      "M76 146L86 147L102 168L130 178L161 178L158 189L119 194L91 183L73 183L62 171Z",
    ],
    maxilla: [
      "M59 166L73 183L91 183L111 204L103 236L43 234L37 221L39 199L31 194L34 182Z",
    ],
    mandible: [
      "M45 250L104 251L119 225L120 206L139 213L157 204L167 213L149 269Q137 298 94 306L42 292L33 271Z",
    ],
  },
  base: {
    maxilla: ["M79 38Q140 9 201 38L213 98L185 127L95 127L67 98Z"],
    palatine: [
      "M95 127L140 125L140 160L105 157Z",
      "M185 127L140 125L140 160L175 157Z",
    ],
    vomer: ["M136 83L144 83L146 177L134 177Z"],
    sphenoid: [
      "M77 155L101 168L114 153L134 177L146 177L166 153L179 168L203 155L217 190L187 206L167 195L155 208L125 208L113 195L93 206L63 190Z",
    ],
    temporal: [
      "M63 190L93 206L113 195L112 241L84 265L51 234Z",
      "M217 190L187 206L167 195L168 241L196 265L229 234Z",
    ],
    occipital: [
      "M125 208L155 208L168 241L196 265L203 291Q140 333 77 291L84 265L112 241Z",
    ],
  },
};

export function SkullMap({
  view = "front",
  active,
  onSelect,
  decorative = false,
}: {
  view?: SkullView;
  active?: string;
  onSelect?: (id: string) => void;
  decorative?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 280 340"
      className={`skull-map skull-${view}`}
      role={decorative ? "img" : "group"}
      aria-label="Схема костей черепа"
    >
      <defs>
        <filter
          id={`bone-shadow-${view}`}
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
        >
          <feDropShadow
            dx="0"
            dy="4"
            stdDeviation="5"
            floodColor="#23332b"
            floodOpacity=".09"
          />
        </filter>
      </defs>
      <g filter={`url(#bone-shadow-${view})`}>
        {Object.entries(maps[view]).map(([id, paths]) => {
          const b = bones.find((x) => x.id === id)!;
          return (
            <g
              key={id}
              role={decorative ? undefined : "button"}
              tabIndex={decorative ? undefined : 0}
              aria-label={b.name}
              onClick={() => onSelect?.(id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect?.(id);
                }
              }}
              className={decorative ? "" : "bone-region"}
              style={{ opacity: active && active !== id ? 0.3 : 1 }}
            >
              <title>
                {b.name} · {b.latin}
              </title>
              {paths.map((d, i) => (
                <path
                  key={i}
                  d={d}
                  fill={b.color}
                  stroke="#657163"
                  strokeWidth="1.1"
                  strokeLinejoin="round"
                />
              ))}
            </g>
          );
        })}
      </g>
      {view === "front" && (
        <g
          fill="#34403a"
          stroke="#657163"
          strokeWidth="1.1"
          pointerEvents="none"
        >
          <path d="M71 130Q93 115 118 132L118 157Q92 174 75 155Z" />
          <path d="M209 130Q187 115 162 132L162 157Q188 174 205 155Z" />
          <path
            d="M133 181L127 215L134 220L140 211L146 220L153 215L147 181L140 187Z"
            fill="#596256"
            opacity=".5"
          />
          <path
            d="M88 246L89 264M102 249L103 268M116 252L116 271M131 253L131 273M149 253L149 273M164 252L164 271M178 249L177 268M192 246L191 264"
            fill="none"
          />
        </g>
      )}
      {view === "side" && (
        <g fill="#35433b" pointerEvents="none">
          <path d="M65 142Q96 123 99 150L87 167L66 162Z" />
          <ellipse cx="170" cy="181" rx="9" ry="10" />
          <path
            d="M43 231L102 233L101 248L44 246Z"
            fill="#faf8ed"
            stroke="#657163"
          />
          <path
            d="M52 232v14m10-13v14m10-13v14m10-13v14m10-13v14"
            stroke="#9b9f8c"
          />
        </g>
      )}
      {view === "base" && (
        <g pointerEvents="none">
          <ellipse
            cx="140"
            cy="249"
            rx="24"
            ry="30"
            fill="#35433b"
            stroke="#657163"
          />
          <path
            d="M80 48Q140 15 200 48L197 62Q140 34 83 62Z"
            fill="#f8f6eb"
            stroke="#657163"
          />
          <ellipse cx="111" cy="183" rx="6" ry="9" fill="#596256" />
          <ellipse cx="169" cy="183" rx="6" ry="9" fill="#596256" />
        </g>
      )}
    </svg>
  );
}

export function BoneGlyph({ id, color }: { id: string; color: string }) {
  const shape: Record<string, string> = {
    frontal: "M15 46Q7 10 40 8Q73 10 65 46L56 52L46 44L40 50L34 44L24 52Z",
    parietal: "M19 13L54 7L68 49L49 62L12 48Z",
    temporal:
      "M20 14Q45 2 54 22L50 36L71 37L74 43L47 46L39 67L33 50L22 55L15 44L8 31Z",
    occipital:
      "M15 23Q40 1 65 23L69 51L54 63L26 63L11 51ZM31 42Q40 30 49 42L47 55L33 55Z",
    sphenoid:
      "M7 17L28 30L33 23L40 28L47 23L52 30L73 17L68 43L53 46L50 65L44 60L40 45L36 60L30 65L27 46L12 43Z",
    ethmoid:
      "M37 8L43 8L46 23L60 22L66 41L58 50L45 44L43 68L37 68L35 44L22 50L14 41L20 22L34 23Z",
    maxilla:
      "M31 6L42 8L45 25L63 29L67 41L54 45L55 62L19 62L14 53L21 36L29 29Z",
    zygomatic: "M30 9L41 6L44 28L65 43L62 52L42 46L24 60L11 42L23 28Z",
    nasal: "M30 10L45 9L53 55L40 64L25 54Z",
    lacrimal: "M27 12L48 13L53 57L30 62L24 43Z",
    palatine: "M22 8L34 9L36 51L65 52L65 64L20 64Z",
    vomer: "M16 19L65 9L59 53L29 67Z",
    concha:
      "M12 34Q29 10 62 27Q79 39 55 49L26 57L15 46Q53 27 59 38Q34 41 12 44Z",
    mandible:
      "M9 14L20 17L23 43Q40 55 57 43L60 17L71 14L68 52Q63 70 40 71Q17 70 12 52Z",
  };
  return (
    <svg viewBox="0 0 80 80" className="bone-glyph" aria-hidden="true">
      <path
        d={shape[id]}
        fill={color}
        fillRule="evenodd"
        stroke="#687364"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </svg>
  );
}
