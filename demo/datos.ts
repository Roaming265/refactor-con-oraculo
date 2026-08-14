// ─────────────────────────────────────────────────────────────────────────────
// DATASET SINTÉTICO.
//
// Nada de acá salió de una operación real: los campos, los lotes, los insumos y los
// precios están inventados. Los insumos van por categoría genérica ("Herbicida total")
// y no por marca comercial, a propósito.
//
// Lo único que se respetó del mundo real es la FORMA del dato, que es donde está el
// problema:
//
//  · Las cantidades y los precios entran como STRING, sin parsear. Así llegan de un
//    formulario: lo que hay es lo que alguien tecleó.
//  · Están mezcladas las dos formas de escribir un número que conviven en la misma
//    planilla: la argentina ("1.500" = mil quinientos, "12,50" = doce con cincuenta) y
//    la que teclea quien viene de una planilla en inglés ("13.5", "0.82").
//  · Las fechas caen a los dos lados del corte de campaña, incluidos los bordes: el
//    28/04 y el 30/04 (última campaña) contra el 01/05 y el 02/05 (la que arranca).
//  · Cada compra registra por qué PANTALLA se cargó. En el sistema original eran seis
//    pantallas distintas escribiendo la misma tabla, y no todas escribían igual.
// ─────────────────────────────────────────────────────────────────────────────

/** Qué pantalla cargó la compra. Importa: no todas escribían la campaña igual. */
export type Origen = 'facturación' | 'carga manual';

export interface Compra {
  fecha: string;      // ISO "yyyy-mm-dd"
  campo: string;
  lote: string;
  insumo: string;
  cantidad: string;   // TIPEADO, sin parsear
  precioUsd: string;  // TIPEADO, sin parsear
  origen: Origen;
}

export const COMPRAS: Compra[] = [
  // ── campaña 2024/2025 ──────────────────────────────────────────────────────
  { fecha: '2024-06-12', campo: 'Campo Norte', lote: 'Lote 1', insumo: 'Herbicida total',          cantidad: '200',    precioUsd: '12,50', origen: 'facturación' },
  { fecha: '2024-09-03', campo: 'La Loma',     lote: 'Lote 3', insumo: 'Fertilizante nitrogenado', cantidad: '1.500',  precioUsd: '0,68',  origen: 'facturación' },
  { fecha: '2025-02-20', campo: 'Campo Norte', lote: 'Lote 7', insumo: 'Fungicida foliar',         cantidad: '80',     precioUsd: '31,40', origen: 'carga manual' },
  { fecha: '2025-04-28', campo: 'El Bajo',     lote: 'Lote 2', insumo: 'Semilla de trigo',         cantidad: '3.200',  precioUsd: '0,95',  origen: 'facturación' },

  // ── campaña 2025/2026 ──────────────────────────────────────────────────────
  { fecha: '2025-05-02', campo: 'El Bajo',     lote: 'Lote 2', insumo: 'Semilla de trigo',         cantidad: '4.000',  precioUsd: '1,02',  origen: 'facturación' },
  { fecha: '2025-07-18', campo: 'Campo Norte', lote: 'Lote 1', insumo: 'Herbicida total',          cantidad: '300',    precioUsd: '11,90', origen: 'facturación' },
  { fecha: '2025-09-14', campo: 'El Bajo',     lote: 'Lote 2', insumo: 'Fertilizante nitrogenado', cantidad: '3.000',  precioUsd: '0,71',  origen: 'facturación' },
  { fecha: '2025-10-09', campo: 'La Loma',     lote: 'Lote 3', insumo: 'Fertilizante nitrogenado', cantidad: '2.500',  precioUsd: '0,74',  origen: 'carga manual' },
  { fecha: '2025-11-22', campo: 'Campo Norte', lote: 'Lote 7', insumo: 'Coadyuvante',              cantidad: '60',     precioUsd: '8,25',  origen: 'facturación' },
  { fecha: '2026-01-15', campo: 'La Loma',     lote: 'Lote 9', insumo: 'Fungicida foliar',         cantidad: '120',    precioUsd: '29,80', origen: 'carga manual' },
  { fecha: '2026-03-07', campo: 'El Bajo',     lote: 'Lote 2', insumo: 'Herbicida total',          cantidad: '180',    precioUsd: '13.5',  origen: 'facturación' },
  { fecha: '2026-04-30', campo: 'Campo Norte', lote: 'Lote 1', insumo: 'Insecticida',              cantidad: '45',     precioUsd: '22,10', origen: 'facturación' },

  // ── campaña 2026/2027 ──────────────────────────────────────────────────────
  { fecha: '2026-05-01', campo: 'El Bajo',     lote: 'Lote 2', insumo: 'Semilla de girasol',       cantidad: '1.200',  precioUsd: '2,40',  origen: 'facturación' },
  { fecha: '2026-06-20', campo: 'Campo Norte', lote: 'Lote 1', insumo: 'Herbicida total',          cantidad: '250',    precioUsd: '12.75', origen: 'carga manual' },
  { fecha: '2026-07-11', campo: 'La Loma',     lote: 'Lote 3', insumo: 'Fertilizante nitrogenado', cantidad: '1.800',  precioUsd: '0.82',  origen: 'facturación' },
  { fecha: '2026-08-02', campo: 'La Loma',     lote: 'Lote 9', insumo: 'Fertilizante nitrogenado', cantidad: '1390.5', precioUsd: '0,79',  origen: 'facturación' },
];
