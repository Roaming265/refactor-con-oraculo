// ─────────────────────────────────────────────────────────────────────────────
// TEST DE EQUIVALENCIA — formato.
//
// Compara el módulo único `src/formato.ts` contra las 31 copias que reemplazó, guardadas
// acá VERBATIM como testigo.
//
// A DIFERENCIA del test de campaña, acá SÍ se esperan diferencias: tres de las copias
// estaban rotas y el punto del refactor es arreglarlas. Entonces el test hace dos cosas
// distintas y no las mezcla:
//
//   PARTE 1 — LO QUE NO SE PUEDE MOVER. Las copias que ya eran correctas tienen que dar
//             idéntico. Una sola diferencia acá y el refactor está mal. Rompe el test.
//   PARTE 2 — LO QUE SE MUEVE A PROPÓSITO. Lista cada diferencia con su ejemplo, para
//             leerla y aprobarla. No rompe el test: informa.
//
// Esa separación es la que hace que el test sirva. Un test que solo dijera "todo igual"
// sería imposible de pasar (había que arreglar los bugs); uno que solo dijera "todo bien"
// dejaría pasar un cambio de comportamiento sin que nadie lo mire.
//
// Uso: node test/formato.ts
// ─────────────────────────────────────────────────────────────────────────────
import { parseNum, nf, nf0, nfN, usd, fmtFecha, fmtCorta, hoyISO, diasEntre, TZ } from '../src/formato.ts';

// ── LAS COPIAS VIEJAS, VERBATIM ──────────────────────────────────────────────
// parseNum variante A — "el punto SIEMPRE es separador de miles" (3 copias)
function viejo_parseNum_A(s: string): number {
  return Number(String(s).trim().replace(/\./g, '').replace(',', '.'));
}
// parseNum variante B — "si hay coma, la coma manda; si no, Number() crudo" (2 copias)
function viejo_parseNum_B(s: string): number {
  const t = String(s ?? '').trim();
  if (!t) return NaN;
  if (t.includes(',')) return Number(t.replace(/\./g, '').replace(',', '.'));
  return Number(t);
}
// parseNum variante C — la buena (1 copia)
function viejo_parseNum_C(s: string): number {
  const t = String(s ?? '').trim();
  if (!t) return NaN;
  if (t.includes(',')) return Number(t.replace(/\./g, '').replace(',', '.'));
  if (/^\d{1,3}(\.\d{3})+$/.test(t)) return Number(t.replace(/\./g, ''));
  return Number(t);
}
// nf con default 2 (4 copias) y con default 0 (2 copias) — mismo cuerpo, distinto default
const viejo_nf2 = (n: number, d = 2) => n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: d });
const viejo_nf0dec = (n: number, d = 0) => n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: d });
// nf0 — idéntica en 7 copias
const viejo_nf0 = (n: number) => Math.round(n).toLocaleString('es-AR');
// nfN / usd — idénticas en 2 copias cada una
const viejo_nfN = (n: number) => (Math.round(n * 100) / 100).toLocaleString('es-AR', { maximumFractionDigits: 2 });
const viejo_usd = (n: number) => `u$s ${viejo_nf0(n)}`;
// fmtFecha por split (2 copias) y por regex (3 copias) — mismo resultado, dos caminos
function viejo_fmtFecha_split(iso: string): string {
  const p = iso.slice(0, 10).split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}
function viejo_fmtISO_regex(iso: string): string {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}
// fmtFecha con guarda de null (1 copia) — la única que contemplaba el dato faltante
function viejo_fmtFecha_null(iso: string | null): string {
  if (!iso) return '—';
  const p = iso.slice(0, 10).split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}
function viejo_fmtCorta(iso: string | null): string {
  if (!iso) return '';
  const p = iso.slice(0, 10).split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}` : iso;
}
function viejo_hoyISO_utc(): string { return new Date().toISOString().slice(0, 10); }
function viejo_hoyISO_ar(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
}
function viejo_diasEntre(a: string, b: string): number {
  const da = new Date((a ?? '').slice(0, 10) + 'T00:00:00Z').getTime();
  const db = new Date((b ?? '').slice(0, 10) + 'T00:00:00Z').getTime();
  if (!Number.isFinite(da) || !Number.isFinite(db)) return NaN;
  return Math.round((da - db) / 86400000);
}

// ── lo que se le tipea a la app ──────────────────────────────────────────────
const TIPEOS = [
  // enteros limpios
  '1', '7', '80', '1390', '80000', '1000000',
  // con coma decimal (lo normal acá)
  '1390,5', '1.390,50', '80.000,25', '0,5', '12,75', '1.000.000,01',
  // con punto de miles
  '1.390', '80.000', '1.000.000', '999.999',
  // con punto DECIMAL (lo que teclea quien viene de una planilla en inglés)
  '1390.5', '12.5', '0.5', '3.25', '1000.75',
  // trampas: el punto seguido de menos/más de 3 dígitos
  '1.39', '1.3900', '12.34', '1.0000',
  // vacíos y basura
  '', '   ', 'abc', '-', ',', '.', 'null', '12,5,7', '1..390',
  // negativos
  '-1390', '-1.390', '-1390,5', '-12.5',
  // espacios de más
  ' 1390 ', ' 1.390,50 ',
];
const NUMEROS = [0, 1, 7, 12.5, 100, 1390.5, 80000, 1000000.456, 0.5, 0.004, -1390.5, 999999.999];
const FECHAS = ['2026-08-12', '2025-04-30', '2025-05-01', '2003-01-01', '2026-12-31',
                '2026-08-12T14:30:00', '2026-08-12T00:00:00Z'];

// ── motor ────────────────────────────────────────────────────────────────────
const rotos: string[] = [];
const movidos: { fn: string; entrada: string; antes: string; ahora: string; por: string }[] = [];
let ok = 0;
const j = (v: unknown) => (typeof v === 'number' && Number.isNaN(v) ? 'NaN' : JSON.stringify(v));

/** PARTE 1: esto NO se puede mover. */
function debeSerIgual(caso: string, viejo: unknown, nuevo: unknown) {
  if (j(viejo) === j(nuevo)) ok++;
  else rotos.push(`${caso}\n      antes: ${j(viejo)}\n      ahora: ${j(nuevo)}`);
}
/** PARTE 2: si se mueve, se anota con su porqué. */
function seMueve(fn: string, entrada: string, viejo: unknown, nuevo: unknown, por: string) {
  if (j(viejo) === j(nuevo)) { ok++; return; }
  movidos.push({ fn, entrada, antes: j(viejo), ahora: j(nuevo), por });
}

// ── PARTE 1 — lo intocable ───────────────────────────────────────────────────
for (const t of TIPEOS) {
  // La variante C era la correcta: el módulo TIENE que copiarla exacto.
  // Único apartamiento declarado: C no contemplaba el signo menos ANTES de un punto de
  // miles ("-1.390" le daba -1,39, el mismo bug que arregla para los positivos). El
  // módulo lo cubre, y por eso ese caso se juzga en la Parte 2, no acá.
  if (/^-\d{1,3}(\.\d{3})+$/.test(t.trim())) continue;
  debeSerIgual(`parseNum("${t}") vs la variante buena`, viejo_parseNum_C(t), parseNum(t));
}
for (const n of NUMEROS) {
  debeSerIgual(`nf(${n}) vs las 4 copias con default 2`, viejo_nf2(n), nf(n));
  debeSerIgual(`nf(${n}, 0)`, viejo_nf2(n, 0), nf(n, 0));
  debeSerIgual(`nf(${n}, 4)`, viejo_nf2(n, 4), nf(n, 4));
  debeSerIgual(`nf0(${n}) vs las 7 copias`, viejo_nf0(n), nf0(n));
  debeSerIgual(`nfN(${n}) vs las 2 copias`, viejo_nfN(n), nfN(n));
  debeSerIgual(`usd(${n}) vs las 2 copias`, viejo_usd(n), usd(n));
}
for (const f of FECHAS) {
  debeSerIgual(`fmtFecha("${f}") vs la de split`, viejo_fmtFecha_split(f), fmtFecha(f));
  debeSerIgual(`fmtFecha("${f}") vs la de regex`, viejo_fmtISO_regex(f), fmtFecha(f));
  debeSerIgual(`fmtFecha("${f}") vs la que guardaba el null`, viejo_fmtFecha_null(f), fmtFecha(f));
  debeSerIgual(`fmtCorta("${f}") vs las 2 copias`, viejo_fmtCorta(f), fmtCorta(f));
}
debeSerIgual('fmtFecha(null) vs la que guardaba el null', viejo_fmtFecha_null(null), fmtFecha(null));
debeSerIgual('fmtCorta(null) vs las 2 copias', viejo_fmtCorta(null), fmtCorta(null));
for (const [a, b] of [['2026-08-12', '2026-08-01'], ['2025-05-01', '2025-04-30'],
                      ['2026-01-01', '2026-12-31'], ['basura', '2026-01-01']] as const) {
  debeSerIgual(`diasEntre("${a}","${b}") vs las 2 copias`, viejo_diasEntre(a, b), diasEntre(a, b));
}
debeSerIgual('hoyISO() vs la versión en hora local (3 copias)', viejo_hoyISO_ar(), hoyISO());

// ── PARTE 2 — lo que se mueve a propósito ────────────────────────────────────
for (const t of TIPEOS) {
  seMueve('parseNum', t, viejo_parseNum_A(t), parseNum(t),
    '3 pantallas tomaban el punto SIEMPRE como separador de miles');
  seMueve('parseNum', t, viejo_parseNum_B(t), parseNum(t),
    '2 pantallas: sin coma, no reconocían el punto de miles');
}
for (const n of NUMEROS) {
  seMueve('nf', String(n), viejo_nf0dec(n), nf(n),
    '2 pantallas tenían el default en 0 decimales, no en 2');
}
seMueve('hoyISO', '(ahora)', viejo_hoyISO_utc(), hoyISO(),
  '3 pantallas usaban UTC: desde las 21:00 hora local daba MAÑANA');
for (const t of TIPEOS.filter((x) => /^-\d{1,3}(\.\d{3})+$/.test(x.trim()))) {
  seMueve('parseNum', t, viejo_parseNum_C(t), parseNum(t),
    'Ni la copia buena contemplaba el menos delante de un punto de miles');
}

// ── veredicto de las partes 1 y 2 ────────────────────────────────────────────
console.log(`\n  PARTE 1 — lo intocable: ${ok.toLocaleString('es-AR')} casos idénticos`);
if (rotos.length) {
  console.log(`\n  ${rotos.length} COSAS QUE SE MOVIERON Y NO DEBÍAN:\n`);
  for (const r of rotos) console.log(`   · ${r}`);
  process.exit(1);
}
console.log('  OK — ninguna copia que ya era correcta cambió de respuesta');

console.log(`\n  PARTE 2 — lo que se mueve a propósito: ${movidos.length} casos\n`);
const porMotivo = new Map<string, typeof movidos>();
for (const m of movidos) {
  if (!porMotivo.has(m.por)) porMotivo.set(m.por, []);
  porMotivo.get(m.por)!.push(m);
}
for (const [motivo, casos] of porMotivo) {
  console.log(`  ── ${motivo}`);
  console.log(`     ${casos.length} ${casos.length === 1 ? 'caso' : 'casos'}:`);
  for (const c of casos) console.log(`       ${c.fn}("${c.entrada}")  ${c.antes} → ${c.ahora}`);
  console.log();
}

// ── PARTE 3 — el bug de UTC, sin depender del reloj ──────────────────────────
// La Parte 2 solo delata la diferencia de `hoyISO` si el test corre después de las 21:00
// hora local, que es cuando UTC ya cambió de día. Como eso lo decide el azar de cuándo lo
// corras, acá se fija un instante concreto y se muestra la consecuencia completa.
const INSTANTE = new Date('2025-05-01T00:30:00Z'); // = 30/04/2025, 21:30 en Argentina
const conUTC = INSTANTE.toISOString().slice(0, 10);
const conLocal = INSTANTE.toLocaleDateString('en-CA', { timeZone: TZ });
console.log('  PARTE 3 — el bug de UTC, con un instante fijo\n');
console.log(`  Instante real: 30/04/2025 a las 21:30 en ${TZ}`);
console.log(`    versión UTC   → fecha "${conUTC}"  → campaña 2025/2026`);
console.log(`    versión local → fecha "${conLocal}"  → campaña 2024/2025`);
console.log('\n  El 30 de abril es el ÚLTIMO día de la campaña. Con la versión UTC, todo lo');
console.log('  que se cargue esa noche se contabiliza en la campaña siguiente: la plata se');
console.log('  muda de ejercicio sin un solo error en pantalla.\n');
