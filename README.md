# Unificar lógica duplicada sin cambiar el comportamiento

La misma cifra tipeada en el mismo formulario daba **13905** en una pantalla y **1390,5**
en otra. Las dos parecían bien. Ninguna tiraba un error.

Este repositorio es una porción de un sistema privado de gestión de costos agrícolas que
está en uso. No es la aplicación: es **un refactor y la evidencia de que no rompió nada**.
Dos funciones que estaban copiadas y pegadas en una docena de pantallas se unificaron en
dos módulos, y se verificó que las versiones nuevas contestan exactamente lo mismo que las
viejas en más de 60.000 casos.

---

## El problema, en términos del negocio

Un productor agrícola carga compras de insumos durante todo el año y necesita saber cuánto
le costó cada campaña. Dos cosas tienen que estar bien para que ese número signifique algo:
el **número que tecleó** (en Argentina la coma es el decimal y el punto separa miles, pero
la mitad de la gente viene de una planilla en inglés y teclea al revés) y **a qué campaña
pertenece cada compra** (la campaña agrícola no coincide con el año calendario: va de mayo
a abril). Si cualquiera de las dos falla, el sistema no muestra un error: muestra un costo
distinto, igual de creíble.

---

## Qué hay acá

```
src/formato.ts      Números y fechas: qué se tipea y qué se muestra
src/campania.ts     La campaña agrícola: a qué ejercicio pertenece una fecha
test/formato.ts     Equivalencia contra las 31 copias que reemplazó
test/campania.ts    Equivalencia contra las 13 copias que reemplazó
demo/datos.ts       Dataset sintético (campos, lotes, insumos y precios inventados)
demo/correr.ts      Las dos consecuencias, sobre ese dataset
```

Cero dependencias. Node corre los `.ts` directamente.

---

## Las decisiones de diseño

### 1. Una sola función, no una copia por pantalla

`campaniaDeFecha` estaba escrita **13 veces en 6 pantallas, con 7 cuerpos distintos**.
`parseNum` y sus compañeras, **31 veces en 12 pantallas**, en tres variantes que no
coincidían.

El costo de eso no es la duplicación en sí. Es que las copias **ya habían divergido**: en
un repositorio hermano del mismo sistema convivían `"2026/2027"`, `"2026/27"` y `"26/27"`
para la misma campaña. Nadie lo había notado porque cada pantalla, mirada sola, se veía
bien.

### 2. El formato de campaña es `"YYYY/YYYY+1"`, y no es una preferencia estética

El motor de costeo compara campañas **como texto**: `order by campania desc` para saber
cuál es la última, `campania <= $1` para acumular hasta una dada. Eso funciona únicamente
porque ese formato ordena lexicográfico igual que cronológico.

Con `"25/26"` mezclado en la misma columna, el orden de texto pone las cortas por delante
de todas las largas (`"2"` = `"2"`, pero `"5"` > `"0"`), y el filtro `<=` deja afuera filas
sin decir nada. El `ACTO 3` del demo lo ejecuta: 3 campañas reales se vuelven 6 baldes, la
"última campaña" pasa a ser una que tiene una sola compra, y el precio promedio de un
insumo se parte en dos promedios creíbles, ninguno correcto.

Por eso el formato vive en una constante (`RE_CAMPANIA`) y hay una sola función que lo
produce.

### 3. El corte del calendario vive en un solo lugar, y es mayo

`MES_CORTE = 5`, una vez. Moverlo es cambiar un renglón, no nueve.

Mayo no es arbitrario: es el mes hueco del ciclo. La mayoría de las siembras son en junio y
la mayoría de las cosechas en marzo y abril, así que un corte en mayo no parte ningún ciclo
productivo al medio. En el sistema de origen esto se decidió midiendo dónde caían las
siembras, las cosechas y las compras contra varios cortes posibles; acá queda el resultado,
no la medición (los datos eran de una operación real).

Además: el corte **propone, no impone**. Un insumo comprado en abril "cae" en la campaña
que termina, pero muchas veces se compró anticipado para la que viene. El calendario no
puede saberlo — lo sabe quien compró. Por eso existe `campVecinas()`, que ofrece las tres
campañas contiguas para corregir a mano.

### 4. La fecha de "hoy" se resuelve en hora local, nunca en UTC

`hoyISO()` no es `new Date().toISOString().slice(0,10)`. Argentina es UTC-3: desde las
21:00 hora local, el ISO en UTC ya es mañana.

Eso no es un detalle cosmético porque **la fecha define la campaña**. Un movimiento cargado
el 30 de abril a las 21:30 — el último día del ejercicio — con la versión UTC queda fechado
el 1 de mayo y se contabiliza en la campaña siguiente. La plata se muda de ejercicio sin un
solo error en pantalla. Tres pantallas tenían la versión UTC. La `PARTE 3` del test de
formato lo demuestra con un instante fijo, para que no dependa de la hora a la que corras
el test.

### 5. `parseNum`: la regla que desempata el punto

El punto es ambiguo y ahí está todo el problema: en `"1.390"` separa miles, en `"1390.5"`
es decimal. La regla:

1. Si hay coma, la coma es el decimal y el punto es miles. Sin vueltas.
2. Sin coma, un punto seguido de grupos **exactos** de 3 dígitos es separador de miles.
3. Cualquier otro punto es decimal.

De las tres variantes que convivían, una tomaba el punto siempre como miles (rompía
`"1390.5"` × 10) y otra no reconocía el punto de miles sin coma (rompía `"1.390"` ÷ 1000).
La tercera acertaba las dos y es la que quedó.

### 6. Vacío devuelve `NaN`, no `0`

A propósito. Quien llama tiene que decidir qué hacer con "no escribió nada", y un `0` haría
pasar por válido un campo en blanco. En un sistema de costos, un `0` silencioso se lee como
"salió gratis".

### 7. Los defaults raros se conservan, aunque sean feos

`campVecinas()` devuelve el string original cuando la entrada no es una campaña;
`campaniaAnterior()` devuelve `''`. Es inconsistente. Se dejó igual **a propósito**:
cambiarlo movería el comportamiento de las pantallas que las usan, y un refactor de
unificación no es el lugar para eso. El test fija esa asimetría para que nadie la
"arregle" sin querer.

### 8. El test tiene dos partes que no se mezclan

Es la decisión que hace que el test sirva.

- **Parte 1 — lo intocable.** Las copias que ya eran correctas tienen que dar idéntico.
  Una sola diferencia acá y el refactor está mal: el test falla.
- **Parte 2 — lo que se mueve a propósito.** Cada diferencia se lista con su ejemplo y su
  motivo, para leerla y aprobarla. No falla: informa.

Un test que solo dijera "todo igual" sería imposible de pasar, porque había bugs que
arreglar. Uno que solo dijera "todo bien" dejaría pasar un cambio de comportamiento sin
que nadie lo mire.

Las copias viejas están guardadas **verbatim** dentro de cada test, recuperadas del
historial. No se tocan: son el oráculo.

---

## La salida

### `node test/campania.ts`

Barre todos los días entre 2003 y 2035 comparando cinco funciones contra sus copias
originales, más los casos de basura y los bordes del corte.

```
  60.298 casos idénticos al código viejo
  OK — el módulo único contesta exactamente lo mismo que las 13 copias
```

### `node test/formato.ts`

```
  PARTE 1 — lo intocable: 215 casos idénticos
  OK — ninguna copia que ya era correcta cambió de respuesta

  PARTE 2 — lo que se mueve a propósito: 25 casos

  ── 3 pantallas tomaban el punto SIEMPRE como separador de miles
     14 casos:
       parseNum("1390.5")  13905 → 1390.5
       parseNum("12.5")  125 → 12.5
       parseNum("1000.75")  100075 → 1000.75
       parseNum("")  0 → NaN
       ...

  ── 2 pantallas: sin coma, no reconocían el punto de miles
     5 casos:
       parseNum("1.390")  1.39 → 1390
       parseNum("80.000")  80 → 80000
       parseNum("1.000.000")  NaN → 1000000
       ...

  PARTE 3 — el bug de UTC, con un instante fijo

  Instante real: 30/04/2025 a las 21:30 en America/Argentina/Buenos_Aires
    versión UTC   → fecha "2025-05-01"  → campaña 2025/2026
    versión local → fecha "2025-04-30"  → campaña 2024/2025
```

### `node demo/correr.ts`

16 compras sintéticas leídas por las tres versiones de `parseNum`:

| tipeado | A (punto=miles) | B (Number crudo) | C (el módulo) |
|---|---:|---:|---:|
| `1.500 × 0,68` | 1.020 | 1,02 | 1.020 |
| `180 × 13.5` | 24.300 | 2.430 | 2.430 |
| `250 × 12.75` | 318.750 | 3.187,5 | 3.187,5 |
| `1.800 × 0.82` | 147.600 | 1,48 | 1.476 |
| **TOTAL** | **u$s 530.282** | **u$s 20.380** | **u$s 36.839** |

Y el formato de campaña equivocado, sobre las mismas 16 compras:

```
  3 campañas reales se convierten en 6 baldes:

  lo guardado    compras     total USD  campaña real
  ────────────  ────────  ────────────  ──────────────
  26/27                1       3.187,5  2026/2027
  25/26                2         5.426  2025/2026
  24/25                1         2.512  2024/2025
  2026/2027            3       5.454,5  2026/2027
  2025/2026            6      13.699,5  2025/2026
  2024/2025            3         6.560  2024/2025

  b) "acumulá todo hasta 2026/2027"  →  campania <= '2026/2027'
     Quedan afuera:  24/25, 25/26, 26/27
     Son 4 compras por u$s 11.126 que el motor no ve. Sin error, sin
     advertencia, sin fila en rojo. Simplemente no están.

  c) Y el precio promedio de un insumo se parte en dos:

     Fertilizante nitrogenado — campaña 2025/2026
       Precio promedio correcto (2 compras): u$s 0,72 por unidad
         balde "2025/2026"  →  1 compra(s), promedio u$s 0,71
         balde "25/26"      →  1 compra(s), promedio u$s 0,74
```

---

## Cómo correrlo

Requiere **Node 22.18 o superior** (ejecuta TypeScript sin compilar). No hay que instalar
nada: el repositorio no tiene dependencias.

```bash
git clone <este-repo>
cd refactor-con-oraculo

node test/campania.ts     # test de equivalencia (12.000+ fechas)
node test/formato.ts      # test de equivalencia, en dos partes
node demo/correr.ts       # el demo de punta a punta

npm test                  # los dos tests
```

Los tests salen con código distinto de cero si algo que no debía moverse se movió.

---

## Estado actual y qué falta

Esto es **trabajo en curso extraído de un sistema en uso**, no una librería terminada.
Lo que falta, en orden de importancia:

- **El espejo con la base se verifica leyendo, no automáticamente.** `campaniaDeFecha()` es
  la contraparte en TypeScript de una función `campania_de(date)` que vive en Postgres y es
  la definición canónica (genera columnas, por eso no se toca). Si alguien cambiara la
  función SQL, nada en este repositorio se enteraría. Un test que consulte la base y
  compare las dos implementaciones sobre el mismo barrido de fechas es el paso que falta.
- **No hay separación entre el dato y su presentación.** El formato corto (`"25/26"`) es
  legítimo **para mostrar**; el problema es que se guardó. Falta una `campaniaCorta()`
  explícita, documentada como "solo se muestra, nunca se guarda". Hoy la única defensa es
  que no existe la función.
- **`parseNum` resuelve una ambigüedad real por decreto.** `"999.999"` se interpreta como
  999.999 (novecientos noventa y nueve mil) y no como 999,999. La regla de los grupos
  exactos de 3 dígitos lo decide, pero el dato es genuinamente ambiguo y no hay forma de
  saberlo desde el string. El sistema convive con eso; una entrada de moneda que valide
  mientras se tipea sería mejor que adivinar después.
- **Solo contempla una zona horaria.** `TZ` es una constante. Para más de una zona, hay que
  pasarla como parámetro y decidir de quién es el "hoy" que importa.
- **Los tests no usan framework.** Son scripts que imprimen y salen con código de error. Es
  suficiente para lo que hacen y evita la dependencia, pero no se integran con nada.
- **No hay integración continua.** Los tests se corren a mano.

### Sobre el código publicado

Es una porción de un sistema privado. Se anonimizaron las rutas internas, los nombres de
las seis pantallas de origen (van como A–F), las referencias a repositorios y migraciones
internas, y el proveedor real. Las funciones, los comentarios y los tests son los del
sistema, sin recortes.

Los datos del demo son inventados de cero: los campos, los lotes, los precios y los insumos
—que van por categoría genérica y no por marca comercial— no corresponden a ninguna
operación real.
