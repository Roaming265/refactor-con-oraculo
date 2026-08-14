// ─────────────────────────────────────────────────────────────────────────────
// TEST DE EQUIVALENCIA — campaña.
//
// Prueba que el módulo único `src/campania.ts` contesta EXACTAMENTE lo mismo que las 13
// copias que reemplazó.
//
// Las copias de abajo son el código VERBATIM que estaba en cada pantalla antes del
// refactor, recuperado del historial. No se tocan: son el testigo. Si el módulo se aparta
// de ellas en un solo día, este test lo grita.
//
// Las 6 pantallas van anonimizadas (A–F) porque el repo de origen es privado; lo que
// importa es cuántas eran y que no coincidían entre sí:
//
//   A · tablero de costos      D · carga manual de comprobantes
//   B · facturación            E · editor de contrato
//   C · comprobantes cargados  F · copiar campaña
//
// 13 llamadas, 7 cuerpos distintos, 6 pantallas.
//
// Uso: node test/campania.ts
// ─────────────────────────────────────────────────────────────────────────────
import {
  campaniaActual, campaniaDeFecha, campVecinas, campaniaSiguiente,
  campaniaAnterior, rangoCampania, MES_CORTE,
} from '../src/campania.ts';

// ── LAS COPIAS VIEJAS, VERBATIM ──────────────────────────────────────────────
// Pantalla B · Pantalla C (idénticas)
function viejo_campaniaActual_B(): string {
  const d = new Date();
  const y = d.getFullYear();
  return d.getMonth() + 1 >= 5 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}
// Pantalla E — mismo resultado, otro cuerpo. Nadie sabía que la otra existía.
function viejo_campaniaActual_E(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return m >= 5 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}
// Pantalla B · Pantalla D (idénticas)
function viejo_campaniaDeFecha(iso: string): string {
  const [y, m] = iso.split('-').map(Number);
  return m >= 5 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}
// Pantalla B · C · D · E (idénticas) — la más copiada de todas
function viejo_campVecinas(camp: string): string[] {
  const m = camp.match(/^(\d{4})\/(\d{4})$/);
  if (!m) return [camp];
  const a = Number(m[1]);
  return [`${a - 1}/${a}`, `${a}/${a + 1}`, `${a + 1}/${a + 2}`];
}
// Pantalla B (campaniaSiguiente) · Pantalla F (siguienteCamp) — mismo cálculo, otro nombre
function viejo_campaniaSiguiente(camp: string): string {
  const m = camp.match(/^(\d{4})\/(\d{4})$/);
  if (!m) return camp;
  return `${Number(m[1]) + 1}/${Number(m[2]) + 1}`;
}
// Pantalla A (prevCampania). Ojo el default: devuelve '' donde las otras devuelven el
// string original. Esa asimetría es real y el módulo la conserva.
function viejo_prevCampania(c: string): string {
  const m = c.match(/^(\d{4})\/(\d{4})$/);
  return m ? `${Number(m[1]) - 1}/${m[1]}` : '';
}
// Pantalla B
function viejo_rangoCampania(camp: string): { desde: string; hasta: string } {
  const m = camp.match(/^(\d{4})\/(\d{4})$/);
  if (!m) return { desde: '', hasta: '' };
  const hoy = new Date().toISOString().slice(0, 10);
  const finCamp = `${m[2]}-04-30`;
  return { desde: `${m[1]}-05-01`, hasta: hoy < finCamp ? hoy : finCamp };
}

// ── el barrido ───────────────────────────────────────────────────────────────
let ok = 0;
const rotos: string[] = [];
const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function chequear(caso: string, viejo: unknown, nuevo: unknown) {
  if (igual(viejo, nuevo)) ok++;
  else rotos.push(`${caso}\n      viejo: ${JSON.stringify(viejo)}\n      nuevo: ${JSON.stringify(nuevo)}`);
}

// 1) TODOS los días de 2003 a 2035 (12.000+ fechas): el corte y las vecinas.
for (let y = 2003; y <= 2035; y++) {
  for (let m = 1; m <= 12; m++) {
    const ultimo = new Date(Date.UTC(y, m, 0)).getUTCDate();
    for (let d = 1; d <= ultimo; d++) {
      const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const v = viejo_campaniaDeFecha(iso);
      chequear(`campaniaDeFecha("${iso}")`, v, campaniaDeFecha(iso));
      chequear(`campVecinas("${v}")`, viejo_campVecinas(v), campVecinas(v));
      chequear(`campaniaSiguiente("${v}")`, viejo_campaniaSiguiente(v), campaniaSiguiente(v));
      chequear(`campaniaAnterior("${v}")`, viejo_prevCampania(v), campaniaAnterior(v));
      chequear(`rangoCampania("${v}")`, viejo_rangoCampania(v), rangoCampania(v));
    }
  }
}

// 2) La campaña de HOY, por las dos copias viejas (las dos daban lo mismo).
chequear('campaniaActual() vs la copia de la Pantalla B', viejo_campaniaActual_B(), campaniaActual());
chequear('campaniaActual() vs la copia de la Pantalla E', viejo_campaniaActual_E(), campaniaActual());

// 3) Basura: lo que NO es una campaña tiene que caer igual que antes. Cada función con su
//    propio default — campVecinas devuelve el string, campaniaAnterior devuelve ''. Que sea
//    inconsistente es feo, pero cambiarlo movería el comportamiento de las pantallas que la
//    usan, y este refactor NO es el lugar para eso.
const BASURA = ['', '25/26', '2026/27', '2025-A', 'soja', '2025/2026 ', 'null'];
for (const b of BASURA) {
  chequear(`campVecinas(basura "${b}")`, viejo_campVecinas(b), campVecinas(b));
  chequear(`campaniaSiguiente(basura "${b}")`, viejo_campaniaSiguiente(b), campaniaSiguiente(b));
  chequear(`campaniaAnterior(basura "${b}")`, viejo_prevCampania(b), campaniaAnterior(b));
  chequear(`rangoCampania(basura "${b}")`, viejo_rangoCampania(b), rangoCampania(b));
}

// 4) El corte sigue siendo mayo, igual que `campania_de()` en la base.
chequear('MES_CORTE es mayo', 5, MES_CORTE);
chequear('30/04 es la campaña que termina', '2024/2025', campaniaDeFecha('2025-04-30'));
chequear('01/05 es la campaña que arranca', '2025/2026', campaniaDeFecha('2025-05-01'));

// ── veredicto ────────────────────────────────────────────────────────────────
console.log(`\n  ${ok.toLocaleString('es-AR')} casos idénticos al código viejo`);
if (rotos.length) {
  console.log(`\n  ${rotos.length} DIFERENCIAS:\n`);
  for (const r of rotos.slice(0, 20)) console.log(`   · ${r}`);
  process.exit(1);
}
console.log('  OK — el módulo único contesta exactamente lo mismo que las 13 copias\n');
