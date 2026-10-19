// Coordinates in percent of the unchanged OpenStax plate. Only structures
// actually visible in that projection have markers; other surfaces stay in the catalogue.
export type Annotation = {
  latin: string;
  x: number;
  y: number;
  labelX: number;
  labelY: number;
};
const pins = (
  rows: [string, number, number, number?, number?][],
): Annotation[] =>
  rows.map(([latin, x, y, lx, ly]) => ({
    latin,
    x,
    y,
    labelX: lx ?? x,
    labelY: ly ?? y,
  }));
export const annotations: Record<string, Annotation[]> = {
  frontal: pins([
    ["Squama frontalis", 49, 20],
    ["Glabella", 48.5, 30.5],
    ["Margo supraorbitalis", 31, 32.8],
    ["Processus zygomaticus", 27, 35, 22, 38],
  ]),
  temporal: pins([
    ["Pars squamosa", 65, 38],
    ["Pars mastoidea", 33, 72],
    ["Processus zygomaticus", 75, 60],
    ["Tuberculum articulare", 65, 64],
    ["Fossa mandibularis", 62, 73],
    ["Porus acusticus externus", 48, 70],
    ["Processus mastoideus", 39, 82],
    ["Processus styloideus", 62, 90],
  ]),
  occipital: pins([
    ["Squama occipitalis", 46, 35],
    ["Protuberantia occipitalis externa", 50.4, 51.5, 44, 48],
    ["Linea nuchalis superior", 56, 53.5, 64, 50],
    ["Foramen magnum", 50, 61, 43, 63],
    ["Condylus occipitalis", 55, 63.5, 62, 66],
  ]),
  sphenoid: pins([
    ["Corpus", 48, 38, 48, 43],
    ["Ala minor", 63, 24, 67, 17],
    ["Ala major", 26, 27],
    ["Canalis opticus", 45.5, 26.8, 40, 21],
    ["Fissura orbitalis superior", 63.5, 25.4, 73, 25],
    ["Fossa hypophysialis", 48, 31.9, 48, 32],
    ["Foramen rotundum", 59.5, 29.5, 67, 32],
    ["Foramen ovale", 61.9, 34.7, 74, 39],
    ["Foramen spinosum", 65.6, 38.5, 77, 46],
    ["Processus pterygoideus", 60, 86],
  ]),
  ethmoid: pins([
    ["Crista galli", 49.5, 24],
    ["Lamina cribrosa", 56, 35.6],
    ["Lamina perpendicularis", 49.5, 75.5],
    ["Cellulae ethmoidales", 42, 45.5],
    ["Lamina orbitalis", 31, 54.5],
    ["Concha nasalis superior", 53, 51],
    ["Concha nasalis media", 57, 68],
    ["Labyrinthus ethmoidalis", 64, 54],
  ]),
  maxilla: pins([
    ["Corpus maxillae", 51, 55],
    ["Facies orbitalis", 43, 33],
    ["Processus frontalis", 61, 22],
    ["Processus zygomaticus", 33, 53],
    ["Processus alveolaris", 59, 71],
    ["Foramen infraorbitale", 52.5, 45],
  ]),
  mandible: pins([
    ["Corpus mandibulae", 51, 77],
    ["Ramus mandibulae", 24, 60],
    ["Angulus mandibulae", 33, 77.5],
    ["Processus coronoideus", 56, 28],
    ["Processus condylaris", 42, 29],
    ["Caput mandibulae", 19.7, 37],
    ["Incisura mandibulae", 33.5, 50.5],
    ["Lingula mandibulae", 48.5, 40.5, 43, 38],
    ["Foramen mandibulae", 48.8, 42, 56, 41],
    ["Linea mylohyoidea", 52, 49],
    ["Pars alveolaris", 69, 63],
    ["Foramen mentale", 64.3, 72.5],
    ["Protuberantia mentalis", 75, 73],
  ]),
};
