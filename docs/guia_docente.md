# Guía del docente — Clase CNC N° 6 (ROMI Centur 30D · Mach 9)

Fuente: video `Tecno_1_-_Clase_cnc_-_N°6(480P).mp4` (54 min, vertical 480×854, con audio).
Método: 1 fotograma por segundo de todo el video, 4 fotogramas por segundo en los tramos donde se aprietan
teclas (03:20–04:10, 07:10–08:20, 13:50–14:20, 15:50–18:20, 26:55–27:55, 34:55–36:20, 36:00–36:40, 38:10–40:10)
y transcripción automática con Whisper (`small`, español). Los minutos son aproximados (±5 s).
Lo que no se lee bien en el video está marcado como **(dudoso)** y figura como pendiente en el README.

> No había carpeta `referencia/` (ni `fotos_maquina.pdf` ni el video corto de la pantalla en automático):
> todo lo visual sale de este video.

## 0. La máquina vista en el video

- Carcasa gris clara, base azul petróleo, logos **ROMI** azul y **Centur 30D** (30D en rojo), etiqueta "TORNO CNC".
- Puerta corrediza con frente **hexagonal** y **6 ventanas** redondeadas (2 × 3); interior color crema.
- Panel **Mach 9** arriba a la izquierda, sobre el cabezal. En el aula se usa además un **monitor Samsung
  SyncMaster** externo (CRT) con etiquetas de papel **F1…F9** pegadas al costado.
- Plato de **3 garras**, torreta **Duplomatic** (placa visible a las 05:30) con portaherramientas; contrapunta.
- Lubricación de bancada (nivel "LOW"/"HIGH" del aceite, 00:37–01:06) y aire a presión (01:09).

## 1. Panel Mach 9 (foto a las 02:45 y 07:10)

| Zona | Teclas |
|---|---|
| Columna derecha del CRT | F1 … F9 (blancas) |
| Fila bajo el CRT | ▲ (azul) · F10 · F11 · F12 · F13 · F14 · ► (azul) · **EXIT** (naranja) |
| Teclado alfabético | A … Z y **EOB** (naranja, doble) |
| Fila azul | INS · ERROR MSGS · HELP · ZOOM IN · ZOOM OUT · SPACE |
| Teclado numérico | 7 8 9 / 4 5 6 / 1 2 3 / − 0 . (con símbolos en la esquina, vía SHIFT) |
| Columna azul junto a los números | 4 teclas **(dudoso: no se leen)** → en la app: PÁG ▲, PÁG ▼, BORRA, BORRA BLOQ. |
| Cursores | rombo azul ▲ ▼ ◄ ► · **SHIFT** (naranja) · **ENTER** (azul) |
| Franja inferior | parada de emergencia (hongo rojo, aro amarillo) · selector negro − / + · perilla **F %** · perilla **S %** · placa "ROMI MACH 9" · botones **rojo**, **naranja**, **verde** |

Forma de pulsar (02:00): "con la yema del dedo, no con la uña".

## 2. Encendido y acceso (00:00 – 04:10)

1. Interruptor general y llave (00:00–00:28). Verificar aceite y aire (00:28–01:14).
2. Pantalla **PAGINA DE ACCESO / AVANCE INHIBIDO / INACTIVO** con **COD ACCESO:** (03:18).
3. Se escribe el código de operador con las letras y se confirma (03:47–04:02). Aparece **COD ACCESO-2:**
   "acceso 2: ahí podemos programar" (04:05). Los otros niveles (parámetros) son del encargado.
4. Abajo queda el mensaje **EJES DESCONECTADOS** (04:11): los servomotores no están energizados.
   Se puede programar, pero **no simular** (06:11–06:25).

## 3. Conectar los ejes: EN MANDO (06:28 – 08:21)

1. Con la flecha (► / ▲ de la fila F10–F14) se recorren los grupos de funciones de abajo (06:28–07:47):
   - `SUEL/PREN PIEZA · OPERADOR LIBERA · AVAN/RETR PINOLA · MOV. HUS HORARIO · MOV. HUS ANTIHOR` (visto a las 03:50)
   - refrigeración manual / automática (06:50) **(nombres exactos dudosos)**
   - incremento / decremento, seguridad (puerta), plato externo (07:03–07:08) **(dudoso)**
   - `EN MANDO · AVANCA B. CONTRAPUN · RETROCED. CONTRAPUN` (visto a las 08:20)
   Varias son opcionales que esta máquina "básica" no tiene (07:21–07:45).
2. Con **EN MANDO** visible se pulsa su tecla (F10) → desaparece "EJES DESCONECTADOS" (07:49–07:54);
   la bancada empieza a recibir aceite.
3. **EXIT** varias veces hasta la pantalla de inicio (07:57–08:21).

## 4. Página de modo (menú principal, 08:21 – 09:21)

`PAGINA DE MODO / AVANCE INHIBIDO / INACTIVO` y el recuadro `TORNO ROMI EA40004`.

| Tecla | Función (rótulo en pantalla) |
|---|---|
| F1 | REPOSO |
| F2 | **EDITOR** ("la segunda opción", 08:37) |
| F3 | REFER. TRABAJO (medidas de herramientas, 08:57) |
| F4 | CARGAR / SALVAR (desde/hacia la computadora, 08:47) |
| F5 | AUTO (trabajo en la pieza) |
| F6 | PRUEBA |
| F7 | MANUAL (referenciar, MDI) |
| F8 | — |
| F9 | SOPORTE (configuración: no entrar) |
| F10–F14 | grupo de abajo (EN MANDO, contrapunta…) |

## 5. Editor y directorio (09:21 – 14:00)

- **EDITOR** muestra `* EXTERNO *`, `Programa`, `Flags`, `Tamano`, `Disponible 51988` (09:25, foto 09:30).
  Rótulos F: F2 EDITOR · F4 PRG. NUEVO · F5 PROX. PRG. · F6 RENUMERAR · F7 LIMPIAR PROGRAMA · F8 LIMPIAR TODO · F9 DIRECTOR.
- **F9 DIRECTORIO**: lista `P001 … P010` y la memoria disponible (10:00); F1 FLAGS, F9 PROX. PAG.
- Se escribe el número del programa (ej. 11) y **ENTER** → `Programa 11 *PROG NUEVO*`, tamaño 0 (10:09–13:47).
  Cada grupo usa su número: grupo 1 → 11, grupo 2 → 12, grupo 3 → 13… (11:45).
- "F2, dos veces" para empezar a editar (13:55). En la pantalla de edición F1 = **GRAFICOS**.
- **No hace falta grabar**: el control guarda solo (25:35–25:41).

## 6. Cómo se escribe el programa (15:50 – 24:30)

1. Primer bloque siempre **G99** (15:58). El **#** (fin de bloque) lo pone la máquina (16:10).
2. Se baja a la línea siguiente con **EOB** o con la **flecha** (16:16–16:32).
3. **G54** (sistema de coordenadas de la pieza, 16:38).
4. Alejarse: **G0 X100. Z100.** (17:02–18:15). La máquina **pone el espacio sola** entre funciones (17:08);
   con la flecha se retrocede y se **escribe encima** (17:18–17:22).
   **El punto decimal es obligatorio** en las cotas (17:32–18:13).
5. Cambio de herramienta lejos de la pieza: **T0101 M6** — "01 la herramienta, 01 el corrector";
   **M6 ejecuta el cambio** (19:09–20:01). Los códigos (M6) no llevan punto.
6. Giro: **S1000** sin punto = **rpm**; con punto la S se toma como **velocidad de corte** y la rpm se calcula
   (20:13–21:39). **M3** = sentido horario (corte normal); M4 = antihorario (21:43–22:27).
7. "Esas cinco líneas son clave": G99 / G54 / G0 X100. Z100. / T0101 M6 / S… M3 (22:33).
8. Terminar siempre con **M30** (o M02): sin él "se queda estancado" y hay que abortar con SHIFT/ciclo (23:56–24:30).
9. Primer acercamiento: **G0 X25. Z2.** (barra Ø25, cero en la cara, 2 mm fuera, 31:26–33:33). La barra
   se sujeta en el plato calibrado para Ø25 (29:00–31:00).

## 7. Referenciar la máquina (26:30 – 28:25)

Sin referencia **no simula**. EXIT → **MANUAL** → **REFERENCIAR MÁQUINA** → aparece **AGUARDANDO INICIO** →
verificar que ninguna herramienta pueda chocar con la carcasa → **CYCLE START (verde)**. Los ejes van a su
fin de carrera y los valores quedan en cero (27:02–28:20).

## 8. Gráficos y simulación (33:49 – 44:00)

1. Desde el editor: **GRAFICOS** (F1).
2. **VENT. 1** (F9) muestra la pieza; ventana 2 = solo líneas, ventana 3 = no se ve nada:
   "prohibido equivocarse de ventana" (33:59–34:43).
3. **VENTANA → LÍMITES → CERRAR**: aparece el cuadro y se ajusta la pieza a la ventana (35:02–35:56).
4. **CYCLE START** (verde) = automático; el botón **naranja** = "paso a paso, bloque a bloque" (36:02–36:08).
5. Si no corta: el plato estaba en modo **externo/invertido** (36:30–37:31). Para abortar:
   **CYCLE STOP dos veces** (37:00–37:05), EXIT y volver a empezar.
6. Al terminar, **EXIT** amplía la ventana a pantalla completa (37:51–38:03); **ZOOM IN / ZOOM OUT** y las
   **flechas** mueven y agrandan la vista (38:13–39:03); antes de salir, EXIT para borrar la ventana (39:19).
7. **LIMPIAR** borra la gráfica anterior (39:27); **RÁPIDOS** muestra los movimientos rápidos
   (punteado = rápido, línea continua = avance de corte) (39:46–40:10).
8. Revisar con zoom las pasadas, el chaflán de alivio y los ángulos (40:10–43:30).

Pantalla de gráfica (fotos 40:20 y 52:15): rótulos F1 LIMPIAR · F3 AJUSTE PROTEC. · F4 CERRAR · F5 LIMITES AJUSTE ·
F7 AMPLIAR · F8 REDUCIR · F9 VENT. 1; abajo Z y X con **4 decimales**, la escala y el estado
(`INACTIVO`, `BLOQUE A BLOQUE`); arriba a la izquierda el bloque actual (ej. `G1Z-64.82F.1`).

## 9. Errores típicos que menciona el docente

- **Olvidar un punto** (44:14–44:50): `X10` sin punto = 10 milésimas de mm → la herramienta se clava, la pieza se
  dobla o se rompe: "un punto que se olvide es una pieza destrozada".
- Rotación excesiva con S con punto (21:05–21:33).
- Herramienta girando al revés (M4) no corta (22:03–22:19).
- Sin M30 el programa no termina (24:00).
- Acercarse justo a Z0 en vez de Z2: choque y rotura (33:00–33:17).
- Plato en modo externo/invertido: no sujeta/corta como se espera (36:30).

## 10. MDI y punto cero (47:00 – 53:30)

**MANUAL → MDI** ("entrada manual de datos"): se escribe un bloque (ej. `G0 Z0.`) y se ejecuta con el ciclo
para llevar la herramienta al punto cero y comprobarlo (47:24–49:13). Al final menciona G50 **(dudoso)**.

## 11. Teclas F1–F14 según la pantalla (resumen)

| Pantalla | F1 | F2 | F3 | F4 | F5 | F6 | F7 | F8 | F9 |
|---|---|---|---|---|---|---|---|---|---|
| Acceso | — | — | — | — | — | — | — | — | — |
| Modo | REPOSO | EDITOR | REFER. TRABAJO | CARGAR/SALVAR | AUTO | PRUEBA | MANUAL | — | SOPORTE |
| Editor | — | EDITOR | — | PRG. NUEVO | PROX. PRG. | RENUMERAR | LIMPIAR PROGRAMA | LIMPIAR TODO | DIRECTOR. |
| Directorio | FLAGS | — | — | — | — | — | — | — | PROX. PAG. |
| Edición | GRAFICOS | — | — | — | — | — | — | — | — |
| Gráfica | LIMPIAR | (RÁPIDOS)* | AJUSTE PROTEC. | CERRAR | LIMITES AJUSTE | — | AMPLIAR | REDUCIR | VENT. 1 |
| Manual | (REFERENCIAR / MDI)* | | | | | | | | |

F10–F14: el grupo de funciones de la fila de abajo (EN MANDO, SUEL/PREN PIEZA, MOV. HUS, refrigeración,
contrapunta…), que se cambia con ▲ / ►. *Posición exacta de la tecla no visible en el video: en la app
RÁPIDOS = F2 y en MANUAL F4 = MDI, F5 = REFER. MAQUINA (propuesta).
