// Programas de prueba para la prueba de oro (cubren parse, interpret, Sim y cam).
export const PROGRAMS = {
  basico: `;EJE
G99
G54
G0 X100. Z100.
T0101 M6
G97
S1000 M3
G0 X26. Z2.
G1 X22.5 F0.15
Z-30.
G0 X26.
Z2.
M5
M02
`,
  errores: `G0 X50 Z5
G1 X20 Z-10
T0101 X10
G2 X30. Z-20.
G3 X40. Z-25. R1.
G1 X10.123456 Z-5
G0 G1 X3
M3 S5000
G1 X5. Z-200. F0.2
(comentario)
G55 X1 ? 
`,
  roscas: `T0505 M6
G97
S600 M3
G0 X22. Z5.
G37 X17.546 Z-20. K2.5 D0.3 E1. U0.05 L1
G0 X22. Z5.
G76 X17.546 Z-20. K2.5 U1.227 W0.3
G0 X22. Z5.
G33 Z-20. K2.5
M30
`,
  css: `G99
T0303 M6
G96
S180 M3
G92 S2500
G0 X30. Z1.
G1 X0. F0.1
G0 Z3.
G97
S800 M3
G0 X20. Z1.
G1 Z-15. F0.12
G2 X26. Z-18. I26. K-15.
G0 X40.
T0707 M6
G0 X30. Z-40.
G1 X0.
M02
`,
  choque: `T0101 M6
S1000 M3
G0 X30. Z2.
G0 X10. Z-20.
G1 Z-120. F0.2
M02
`
};
export const CAM_CASES = [
  { name: 'PIEZA', barD: 25, ap: 0.5, F: 0.1, S: 1000, faceStock: 0.5, dec: 2,
    tools: { rough: '0101', finish: '0303', thread: '0505', part: '0707' }, blade: { w: 3, ref: 'der' },
    thread: { on: true, dMaj: 11, dMin: 9.65, pitch: 1.25, zStart: 4, zEnd: -19.2 } },
  { name: 'SIMPLE', barD: 30, ap: 1, F: 0.2, S: 800, faceStock: 1, dec: 2,
    tools: { rough: '0101', finish: '0303', thread: '0505', part: '0707' }, blade: { w: 4, ref: 'izq' },
    profileText: 'X10. Z0.\nG1 X20. Z-5.\nZ-20.\nG2 X26. Z-23. R3.\nG1 Z-40.\n' }
];
