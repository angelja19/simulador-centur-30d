# Teclas F1–F14 en el Simulador completo (Pantalla 2)

Tabla editable. Columna **Origen**: *video* = misma función que el docente usa en la pantalla de gráficos o en la
fila de abajo del Mach 9 (ver `guia_docente.md`); *propuesta* = no aparece en el video y se propone para el 3D.
Si cambias una fila, cambia también `F_LABELS` y la función `fkey()` en `src/screens/sim3d.js`.

| Tecla | Rótulo | Función en el simulador 3D | Origen |
|---|---|---|---|
| F1 | LIMPIAR | Borra las virutas y la trayectoria dibujada | video (LIMPIAR, 39:27) |
| F2 | RAPIDOS | Muestra/oculta la trayectoria: continua = avance, punteada = rápido | video (RÁPIDOS, 39:46) |
| F3 | AJUSTE PROTEC. | Abre/cierra la puerta de protección | propuesta (el rótulo existe en el video, 40:20) |
| F4 | CERRAR | Encuadra la cámara en la pieza ("cerrar" la ventana sobre la pieza) | video (VENTANA → LÍMITES → CERRAR, 35:10) |
| F5 | LIMITES | Muestra/oculta el cuadro de límites de la barra | video (LÍMITES, 35:16) |
| F6 | SEGUIR HERRAM. | La cámara sigue a la herramienta | propuesta |
| F7 | AMPLIAR | Acerca la cámara | video (AMPLIAR) |
| F8 | REDUCIR | Aleja la cámara | video (REDUCIR) |
| F9 | VENT. | Cambia de vista: 1 zona de corte · 2 máquina completa · 3 superior | video (VENT. 1, 34:00) adaptado a 3D |
| F10–F14 | (grupo de abajo) | Las mismas funciones del Mach 9: SUEL/PREN PIEZA (abre/cierra las garras), MOV. HUS HORARIO/ANTIHOR (gira el husillo), REFRIG. (refrigerante), AVAN/RETR PINOLA y AVANCA/RETROCED. CONTRAPUN (contrapunta), EN MANDO (conecta ejes), PLATO EXTERNO | video (03:50, 06:28–08:20) |
| ▲ / ► | — | Cambian el grupo de funciones de F10–F14 | video (06:28) |
| EXIT | — | Sale de la pieza final / cierra el panel lateral / vista de la máquina completa | video (EXIT) |
| SHIFT+F1 | — | Corte en sección de la pieza final | propuesta |
| SHIFT+F2 | — | Cotas de la pieza final | propuesta |
| SHIFT+F3 | — | Comparación con el perfil objetivo (colores) | propuesta |
| SHIFT+F4 | — | Pieza final en detalle (entrar/salir) | propuesta |
| Espacio / Enter | — | START–STOP / bloque a bloque (teclado de la PC) | propuesta |

Botones grandes (abajo a la derecha): **rojo** CYCLE STOP (dos veces = abortar), **naranja** bloque a bloque,
**verde** CYCLE START; la barra **F %** es el override de avance (0–140 %).
