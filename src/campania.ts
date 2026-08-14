// ─────────────────────────────────────────────────────────────────────────────
// LA CAMPAÑA — módulo único.
//
// Una campaña agrícola es el ejercicio contra el que se acumulan las compras: arranca en
// mayo y termina el 30 de abril siguiente. Se escribe "2025/2026".
//
// Este archivo es el espejo en TypeScript de la función `campania_de(date)` de la base,
// que es la definición CANÓNICA. La base manda: es `immutable` porque genera columnas, así
// que no se toca. El front no puede importarla → la espeja acá, UNA vez. Antes esto estaba
// copiado y pegado en 6 pantallas (13 copias, 7 cuerpos distintos); en el repo hermano las
// copias YA habían divergido ("2026/2027" vs "2026/27" vs "26/27").
//
// Dos reglas que no se negocian:
//  · El corte vive en MES_CORTE, una sola vez. Moverlo es cambiar un renglón, no nueve.
//  · El formato es "YYYY/YYYY+1" y punto. El motor de costeo compara campañas como TEXTO
//    (`order by campania desc`, `campania <= p_campania`), y funciona solo porque ese
//    formato ordena lexicográfico igual que cronológico. Cualquier otro ("24/25",
//    "2026/27") rompe el costeo EN SILENCIO, sin tirar error. El demo lo muestra.
//
// Ojo con las fechas: `campaniaActual()` mira el reloj LOCAL (no UTC) a propósito. Con
// UTC, el 30 de abril a las 21:00 de acá ya es 1 de mayo en Londres y la app cambiaría
// de campaña seis meses antes de tiempo.
// ─────────────────────────────────────────────────────────────────────────────
import { hoyISO } from './formato.ts';

/** Mes en que arranca la campaña nueva. 5 = mayo. Espejo de `extract(month) >= 5`. */
export const MES_CORTE = 5;

/** La única forma válida de un string de campaña. */
export const RE_CAMPANIA = /^(\d{4})\/(\d{4})$/;

/** ¿Es un string de campaña bien formado? Útil antes de guardar. */
export function esCampania(camp: string): boolean {
  const m = String(camp ?? '').match(RE_CAMPANIA);
  return !!m && Number(m[2]) === Number(m[1]) + 1;
}

/** Año de arranque de la campaña ("2025/2026" → 2025). null si no es una campaña. */
export function anioDeCampania(camp: string): number | null {
  const m = String(camp ?? '').match(RE_CAMPANIA);
  return m ? Number(m[1]) : null;
}

/** Arma la campaña que arranca en el año `a` ("YYYY/YYYY+1"). */
export function campaniaDeAnio(a: number): string {
  return `${a}/${a + 1}`;
}

/**
 * Fecha ISO ("yyyy-mm-dd") → campaña, con el corte de mayo.
 * Es la contraparte exacta de `campania_de()` de la base.
 */
export function campaniaDeFecha(iso: string): string {
  const [y, m] = String(iso ?? '').split('-').map(Number);
  return m >= MES_CORTE ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

/** La campaña de hoy, por el reloj local (ver la nota de UTC arriba). */
export function campaniaActual(): string {
  const d = new Date();
  const y = d.getFullYear();
  return d.getMonth() + 1 >= MES_CORTE ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

// ── CORRECCIÓN A MANO ────────────────────────────────────────────────────────
// El corte del calendario PROPONE; el usuario corrige. Un insumo comprado en abril "cae"
// en la campaña que termina, pero muchas veces es para la que viene — se compró
// anticipado. El calendario no puede saberlo: lo sabe quien compró.

/**
 * Las tres campañas vecinas: la anterior, la que se pasa y la siguiente.
 * Es lo que se ofrece para corregir a mano la campaña de una compra.
 * Si el string no es una campaña, se devuelve tal cual (no se inventan opciones).
 */
export function campVecinas(camp: string): string[] {
  const a = anioDeCampania(camp);
  if (a === null) return [camp];
  return [`${a - 1}/${a}`, `${a}/${a + 1}`, `${a + 1}/${a + 2}`];
}

/** La campaña siguiente (a/a+1 → a+1/a+2). Si no es una campaña, la devuelve igual. */
export function campaniaSiguiente(camp: string): string {
  const a = anioDeCampania(camp);
  return a === null ? camp : `${a + 1}/${a + 2}`;
}

/**
 * La campaña anterior (a/a+1 → a-1/a).
 * Devuelve '' —no el string original— cuando no es una campaña: quien la usa la trata
 * como "no hay anterior" y cae a su propio default. Es el contrato que tenía la copia
 * que reemplazó, y el test lo fija.
 */
export function campaniaAnterior(camp: string): string {
  const a = anioDeCampania(camp);
  return a === null ? '' : `${a - 1}/${a}`;
}

/**
 * Rango de fechas de una campaña, recortado a hoy: del 1 de mayo al 30 de abril, pero
 * nunca más allá de hoy (se usa para la ventana de búsqueda contra el portal del
 * proveedor, que no tiene sentido pedir hacia el futuro).
 */
export function rangoCampania(camp: string): { desde: string; hasta: string } {
  const a = anioDeCampania(camp);
  if (a === null) return { desde: '', hasta: '' };
  const finCamp = `${a + 1}-04-30`;
  const hoy = hoyISO();
  return { desde: `${a}-05-01`, hasta: hoy < finCamp ? hoy : finCamp };
}
