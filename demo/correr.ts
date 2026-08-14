// ─────────────────────────────────────────────────────────────────────────────
// DEMO — de punta a punta, sin base de datos.
//
// Toma el dataset sintético de `datos.ts` y muestra las dos consecuencias que motivaron
// el refactor. No son ejemplos inventados para el demo: son los dos bugs que había.
//
//   ACTO 1 — Lo que se TIPEA. La misma planilla leída por las tres versiones de parseNum
//            que convivían. Tres totales distintos, todos creíbles.
//   ACTO 2 — Cómo se AGRUPA. Las compras repartidas por campaña con el corte de mayo.
//   ACTO 3 — El formato que rompe EN SILENCIO. Qué pasa cuando dos pantallas escriben la
//            misma campaña de dos formas distintas.
//
// Uso: node demo/correr.ts
// ─────────────────────────────────────────────────────────────────────────────
import { COMPRAS, type Compra } from './datos.ts';
import { parseNum, nf, nfN, usd } from '../src/formato.ts';
import { campaniaDeFecha } from '../src/campania.ts';

// Las dos variantes rotas, verbatim (las mismas que fija test/formato.ts).
const parseNum_A = (s: string) => Number(String(s).trim().replace(/\./g, '').replace(',', '.'));
const parseNum_B = (s: string) => {
  const t = String(s ?? '').trim();
  if (!t) return NaN;
  if (t.includes(',')) return Number(t.replace(/\./g, '').replace(',', '.'));
  return Number(t);
};

type Parser = (s: string) => number;

// ── ayudas de impresión ──────────────────────────────────────────────────────
interface Col { t: string; w: number; r?: boolean }
function tabla(cols: Col[], filas: string[][]): string {
  const linea = (c: string[]) => ('  ' + c.map((v, i) => (cols[i].r ? v.padStart(cols[i].w) : v.padEnd(cols[i].w))).join('  ')).trimEnd();
  return [
    linea(cols.map((c) => c.t)),
    '  ' + cols.map((c) => '─'.repeat(c.w)).join('  '),
    ...filas.map(linea),
  ].join('\n');
}
function titulo(n: string, t: string) {
  console.log(`\n${'═'.repeat(78)}\n  ${n} — ${t}\n${'═'.repeat(78)}\n`);
}

const total = (c: Compra, p: Parser) => p(c.cantidad) * p(c.precioUsd);
const totalGeneral = (p: Parser) => COMPRAS.reduce((a, c) => a + total(c, p), 0);

// ═════════════════════════════════════════════════════════════════════════════
titulo('ACTO 1', 'lo que se tipea');
console.log(`  ${COMPRAS.length} compras cargadas en una planilla. Las cantidades y los precios están`);
console.log('  como los tecleó una persona. Estas son las tres versiones de parseNum que\n  convivían en la misma app, leyendo exactamente los mismos datos.\n');

const difieren = COMPRAS.filter((c) => {
  const t = [parseNum_A, parseNum_B, parseNum].map((p) => total(c, p));
  return new Set(t.map((x) => x.toFixed(4))).size > 1;
});

console.log(tabla(
  [{ t: 'tipeado', w: 18 }, { t: 'A (punto=miles)', w: 16, r: true },
   { t: 'B (Number crudo)', w: 16, r: true }, { t: 'C (el módulo)', w: 16, r: true }],
  difieren.map((c) => [
    `${c.cantidad} × ${c.precioUsd}`,
    nfN(total(c, parseNum_A)),
    nfN(total(c, parseNum_B)),
    nfN(total(c, parseNum)),
  ]),
));

const tA = totalGeneral(parseNum_A), tB = totalGeneral(parseNum_B), tC = totalGeneral(parseNum);
console.log(`\n  TOTAL de la planilla, según quién la lea:\n`);
console.log(`    Variante A  (el punto siempre es miles) ....  ${usd(tA)}`);
console.log(`    Variante B  (sin coma, Number() crudo) .....  ${usd(tB)}`);
console.log(`    Variante C  (la que quedó en el módulo) ....  ${usd(tC)}`);
const peor = Math.max(tA, tB, tC), mejor = Math.min(tA, tB, tC);
console.log(`\n  Entre la mayor y la menor hay ${usd(peor - mejor)}: la más alta es ${nfN(peor / mejor)} veces la más baja.`);
console.log('  Ninguna tira un error. Las tres devuelven un número creíble.');

// ═════════════════════════════════════════════════════════════════════════════
titulo('ACTO 2', 'cómo se agrupa');
console.log('  La campaña arranca el 1 de mayo. Una compra del 28/04 y otra del 02/05 están a');
console.log('  cuatro días una de otra y pertenecen a ejercicios distintos.\n');

const porCamp = new Map<string, Compra[]>();
for (const c of COMPRAS) {
  const k = campaniaDeFecha(c.fecha);
  if (!porCamp.has(k)) porCamp.set(k, []);
  porCamp.get(k)!.push(c);
}
console.log(tabla(
  [{ t: 'campaña', w: 12 }, { t: 'compras', w: 8, r: true }, { t: 'total USD', w: 12, r: true }, { t: 'desde', w: 12 }, { t: 'hasta', w: 12 }],
  [...porCamp.entries()].sort().map(([k, cs]) => {
    const fechas = cs.map((c) => c.fecha).sort();
    return [k, String(cs.length), nfN(cs.reduce((a, c) => a + total(c, parseNum), 0)), fechas[0], fechas[fechas.length - 1]];
  }),
));
console.log('\n  Los bordes, mirados de cerca:\n');
for (const f of ['2025-04-28', '2025-04-30', '2025-05-01', '2025-05-02']) {
  console.log(`    ${f}  →  ${campaniaDeFecha(f)}`);
}

// ═════════════════════════════════════════════════════════════════════════════
titulo('ACTO 3', 'el formato que rompe en silencio');
console.log('  El motor de costeo compara campañas COMO TEXTO: `order by campania desc` para');
console.log('  saber cuál es la última, y `campania <= $1` para acumular hasta una dada. Eso');
console.log('  funciona sólo porque "YYYY/YYYY+1" ordena lexicográfico igual que cronológico.\n');
console.log('  Supongamos que una de las seis pantallas escribe el formato corto ("25/26").');
console.log('  Nadie lo nota: en pantalla se lee igual de bien.\n');

const corto = (camp: string) => {
  const m = camp.match(/^(\d{4})\/(\d{4})$/);
  return m ? `${m[1].slice(2)}/${m[2].slice(2)}` : camp;
};
// La pantalla de carga manual escribe corto; las demás, canónico.
const campEscrita = (c: Compra) =>
  c.origen === 'carga manual' ? corto(campaniaDeFecha(c.fecha)) : campaniaDeFecha(c.fecha);

const mezcla = new Map<string, Compra[]>();
for (const c of COMPRAS) {
  const k = campEscrita(c);
  if (!mezcla.has(k)) mezcla.set(k, []);
  mezcla.get(k)!.push(c);
}

console.log(`  ${porCamp.size} campañas reales se convierten en ${mezcla.size} baldes:\n`);
console.log(tabla(
  [{ t: 'lo guardado', w: 12 }, { t: 'compras', w: 8, r: true }, { t: 'total USD', w: 12, r: true }, { t: 'campaña real', w: 14 }],
  [...mezcla.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([k, cs]) => [k, String(cs.length), nfN(cs.reduce((a, c) => a + total(c, parseNum), 0)), campaniaDeFecha(cs[0].fecha)]),
));

// (a) order by campania desc
const ordenadas = [...mezcla.keys()].sort().reverse();
const ultimaReal = [...porCamp.keys()].sort().reverse()[0];
console.log(`\n  a) "¿cuál es la última campaña?"  →  order by campania desc`);
console.log(`     Con los datos sanos:  ${ultimaReal}   (${porCamp.get(ultimaReal)!.length} compras)`);
console.log(`     Con la mezcla:        ${ordenadas[0]}        (${mezcla.get(ordenadas[0])!.length} compra)`);
console.log(`     El orden que devuelve: ${ordenadas.join('  >  ')}`);
console.log('     El formato corto gana siempre: "2" = "2", pero "5" > "0".');

// (b) el filtro <=
const hasta = ultimaReal;
const pasan = [...mezcla.keys()].filter((k) => k <= hasta);
const caen = [...mezcla.keys()].filter((k) => !(k <= hasta));
const compsCaen = caen.reduce((a, k) => a + mezcla.get(k)!.length, 0);
const plataCae = caen.reduce((a, k) => a + mezcla.get(k)!.reduce((s, c) => s + total(c, parseNum), 0), 0);
console.log(`\n  b) "acumulá todo hasta ${hasta}"  →  campania <= '${hasta}'`);
console.log(`     Entran:  ${pasan.sort().join(', ')}`);
console.log(`     Quedan afuera:  ${caen.sort().join(', ')}`);
console.log(`     Son ${compsCaen} compras por ${usd(plataCae)} que el motor no ve. Sin error, sin`);
console.log('     advertencia, sin fila en rojo. Simplemente no están.');

// (c) el precio promedio partido
console.log('\n  c) Y el precio promedio de un insumo se parte en dos:\n');
const clave = (c: Compra) => `${c.insumo}||${campaniaDeFecha(c.fecha)}`;
const grupos = new Map<string, Compra[]>();
for (const c of COMPRAS) {
  if (!grupos.has(clave(c))) grupos.set(clave(c), []);
  grupos.get(clave(c))!.push(c);
}
const ppp = (cs: Compra[]) => {
  const q = cs.reduce((a, c) => a + parseNum(c.cantidad), 0);
  const p = cs.reduce((a, c) => a + total(c, parseNum), 0);
  return q ? p / q : NaN;
};
for (const [k, cs] of grupos) {
  const escritas = new Set(cs.map(campEscrita));
  if (escritas.size < 2) continue; // este insumo no se partió
  const [insumo, campania] = k.split('||');
  console.log(`     ${insumo} — campaña ${campania}`);
  console.log(`       Precio promedio correcto (${cs.length} compras): u$s ${nfN(ppp(cs))} por unidad`);
  for (const e of [...escritas].sort()) {
    const parte = cs.filter((c) => campEscrita(c) === e);
    console.log(`         balde "${e}"  →  ${parte.length} compra(s), promedio u$s ${nfN(ppp(parte))}`);
  }
  console.log('\n       Dos promedios creíbles, ninguno correcto, y nada que avise.');
}

console.log('\n' + '═'.repeat(78));
console.log('  Por eso el formato de campaña es una constante y una expresión regular, y por');
console.log('  eso hay una sola función que la calcula. No es prolijidad: es la diferencia');
console.log('  entre un número que se puede mostrar y uno que cambia según quién lo mire.');
console.log('═'.repeat(78) + '\n');
