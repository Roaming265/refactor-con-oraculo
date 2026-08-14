// ─────────────────────────────────────────────────────────────────────────────
// FORMATO — módulo único de números y fechas.
//
// Todo lo que el usuario TIPEA entra por `parseNum`, y todo lo que VE sale por `nf`,
// `nf0`, `nfN`, `usd` o `fmtFecha`. Antes esto estaba copiado 31 veces en 12 pantallas
// y las copias ya habían divergido con plata de por medio:
//
//   escribís     Variante A            Variante B              Variante C
//                (el punto es miles)   (sin coma, Number())    (la buena)
//   "1390.5" →   13905  ✗ (×10)        1390,5  ✓               1390,5  ✓
//   "1.390"  →   1390   ✓              1,39    ✗ (÷1000)       1390    ✓
//
// Las tres convivían en la misma app, sobre los mismos formularios. La C era la única
// que acertaba las dos, y es la que quedó acá.
//
// Un `toLocaleString('es-AR')` fuera de este archivo es un bug esperando.
// ─────────────────────────────────────────────────────────────────────────────

/** Zona horaria del usuario. Las fechas "de hoy" se resuelven acá, no en UTC (ver `hoyISO`). */
export const TZ = 'America/Argentina/Buenos_Aires';

// ── lo que se tipea ──────────────────────────────────────────────────────────

/**
 * Número tipeado a la argentina → float. Tolera las cuatro formas que escribe una
 * persona: "1.390,50" · "1390,5" · "1390.5" · "1390".
 *
 * El punto es ambiguo y ese es todo el problema: en "1.390" es separador de miles, en
 * "1390.5" es decimal. La regla que desempata:
 *  1. Si hay coma, la coma es el decimal y el punto es miles. Sin vueltas.
 *  2. Sin coma, un punto seguido de grupos EXACTOS de 3 dígitos es separador de miles
 *     ("1.390" → 1390, "80.000" → 80000).
 *  3. Cualquier otro punto es decimal ("1390.5" → 1390,5, "12.5" → 12,5).
 *
 * Devuelve NaN si está vacío — a propósito: quien la usa tiene que decidir qué hacer
 * con "no escribió nada", y `0` haría pasar por válido un campo en blanco.
 */
export function parseNum(s: string): number {
  const t = String(s ?? '').trim();
  if (!t) return NaN;
  if (t.includes(',')) return Number(t.replace(/\./g, '').replace(',', '.'));
  if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) return Number(t.replace(/\./g, ''));
  return Number(t);
}

// ── lo que se muestra ────────────────────────────────────────────────────────

/** Número con hasta `d` decimales (default 2), a la argentina. */
export const nf = (n: number, d = 2): string =>
  n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: d });

/** Número redondeado a entero ("1.390"). Para plata que no necesita centavos. */
export const nf0 = (n: number): string => Math.round(n).toLocaleString('es-AR');

/** Número "lindo": hasta 2 decimales y sin ceros de más (12,5 · 7 · 100). */
export const nfN = (n: number): string =>
  (Math.round(n * 100) / 100).toLocaleString('es-AR', { maximumFractionDigits: 2 });

/** Plata en dólares, como se lee acá: "u$s 1.390". */
export const usd = (n: number): string => `u$s ${nf0(n)}`;

// ── fechas ───────────────────────────────────────────────────────────────────

/**
 * ISO ("yyyy-mm-dd", con o sin hora) → "dd/mm/aaaa", que es como se lee acá.
 * Sin fecha devuelve `siVacio` ('—' por default); si el string no tiene forma de fecha
 * se devuelve tal cual, para que un dato raro se VEA en vez de desaparecer.
 */
export function fmtFecha(iso: string | null | undefined, siVacio = '—'): string {
  if (!iso) return siVacio;
  const p = iso.slice(0, 10).split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}

/** ISO → "dd/mm" (corto, para listados apretados). */
export function fmtCorta(iso: string | null | undefined): string {
  if (!iso) return '';
  const p = iso.slice(0, 10).split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}` : iso;
}

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/** ISO → "mié 22/07". El día de la semana importa: delata una cotización de sábado. */
export function fmtDia(iso: string): string {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso ?? '';
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return `${DIAS[d.getDay()]} ${m[3]}/${m[2]}`;
}

/**
 * Hoy, en hora local del usuario, como "yyyy-mm-dd".
 *
 * OJO: NO es `new Date().toISOString().slice(0,10)`. Argentina es UTC-3, así que desde
 * las 21:00 de acá el ISO en UTC ya es MAÑANA. Con esa versión, un movimiento cargado a
 * las 21:30 quedaba fechado al día siguiente — y la fecha define la campaña (es una
 * columna generada en la base), así que un movimiento del 30 de abril a la noche caía en
 * la campaña equivocada. Tres pantallas tenían la versión UTC. Ya no.
 */
export function hoyISO(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
}

/**
 * Días de calendario entre dos ISO (a − b). Ancla los dos a medianoche UTC del día
 * calendario, así la cuenta da días enteros y no mezcla husos.
 */
export function diasEntre(a: string, b: string): number {
  const da = new Date((a ?? '').slice(0, 10) + 'T00:00:00Z').getTime();
  const db = new Date((b ?? '').slice(0, 10) + 'T00:00:00Z').getTime();
  if (!Number.isFinite(da) || !Number.isFinite(db)) return NaN;
  return Math.round((da - db) / 86400000);
}
