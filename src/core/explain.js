// Explicaciones en español sencillo para cada alarma/aviso.
// why: qué regla del Mach 9 o de la máquina se rompe.
// effect: qué pasaría en la máquina real.
// fix: cómo corregirlo.

const E = (why, effect, fix) => ({ why, effect, fix });

const TABLE = [
  // ---------- sintaxis ----------
  [/^ERROR DE CARÁCTER/, E('Un bloque del Mach 9 solo admite letras de dirección (A–Z) seguidas de números, el ; de comentario y el # de fin de bloque.',
    'El control rechaza el bloque al cargarlo: el programa no se puede ejecutar.', 'Borra el carácter extraño o ponlo después de un ; como comentario.')],
  [/^NÚMERO INCOMPLETO/, E('Después de la letra y del signo debe venir un número.', 'El control para con alarma de sintaxis en esa fila.', 'Completa el valor (ej. X-5.).')],
  [/^DEF\. CÓDIGO DOBLE/, E('En un bloque solo puede haber una función de cada letra (un solo G, un solo X…).', 'El control no sabe cuál usar y para el programa con alarma.', 'Separa las funciones en dos bloques.')],
  [/^EXCESO DE CÓDIGO/, E('El Mach 9 acepta como máximo 16 códigos por bloque.', 'El bloque se rechaza.', 'Divide el bloque en dos.')],
  [/^G.* INVÁLIDO$/, E('Esa función G no existe en la lista del Mach 9 (o lleva punto decimal).', 'Alarma de función inválida: la máquina no arranca el ciclo.', 'Revisa el número de la G en la tabla de funciones del manual.')],
  [/^CÓDIGO “M” INVÁLIDO/, E('La función M no está en la lista de funciones misceláneas del manual.', 'El control la ignora o da alarma; la acción esperada (husillo, refrigerante…) no ocurre.', 'Usa una M de la tabla (M3, M4, M5, M8, M9, M02, M30…).')],
  [/^T CON MOVIM\. ILEGAL/, E('El cambio de herramienta y el movimiento de los carros deben ir en bloques separados.',
    'La torreta giraría mientras el carro se mueve: la herramienta puede barrer la pieza o el plato y romperse.', 'Pon T en un bloque solo y el movimiento en el siguiente.')],
  [/^CÓDIGO “T” INVÁLIDO/, E('La T usa 4 dígitos sin punto: posición + corrector (T0101).', 'El control no selecciona ninguna herramienta.', 'Escribe T0101, T0303…')],
  [/EN BLOQUE SEPARADO$/, E('El manual pide programar G96/G97 solas en su bloque (pág. 70).', 'El control puede ignorar el resto del bloque.', 'Deja G96 o G97 en una fila propia.')],
  [/^CÓDIGO FUERA DE GAMA/, E('Las cotas admiten como máximo 4 decimales.', 'El control rechaza el bloque.', 'Redondea el valor a 4 decimales o menos.')],
  [/^MÁS DE \d DECIMALES/, E('La resolución configurada del torno es menor que la cantidad de decimales escrita.', 'El valor se redondea: la medida final puede variar unas centésimas.', 'Usa la cantidad de decimales del torno.')],
  [/^SIN PUNTO DECIMAL/, E('En el manual las cotas se escriben con punto (X20.).', 'Según la configuración, X20 podría leerse como 0,020 mm: la herramienta iría a un lugar muy distinto.', 'Agrega el punto: X20.')],
  [/^COTA SIN PUNTO DECIMAL/, E('En este torno el punto decimal es obligatorio: sin punto la cota se lee en milésimas de milímetro (X10 = 0,010 mm), como explica el docente.',
    'La herramienta va casi a cero: se clava en la pieza, la dobla o la rompe, y puede romper la herramienta. “Un punto que se olvide es una pieza destrozada”.', 'Agrega el punto: X10. en vez de X10.')],
  [/^BLOQUE > 64/, E('Un bloque admite como máximo 64 caracteres incluido el # (manual, pág. 13).', 'El control corta o rechaza el bloque.', 'Acorta el comentario o divide el bloque.')],
  [/^TEXTO DESPUÉS DE #/, E('El # (EOB) cierra el bloque; lo que sigue se ignora.', 'Lo escrito después no se ejecuta.', 'Pasa ese texto a la fila siguiente.')],
  [/^COMENTARIO \( \)/, E('En el Mach 9 los comentarios empiezan con punto y coma.', 'El paréntesis puede dar error de carácter al cargar.', 'Cambia (texto) por ;texto.')],
  [/^COMENTARIO CON M/, E('El comentario no puede contener M00, M01, M02 ni M30 (manual, pág. 13).', 'El control podría detener el programa en ese punto.', 'Quita esa M del comentario.')],
  // ---------- lógica ----------
  [/^PROG\. SIN M02/, E('Todo programa debe terminar con M02 o M30.', 'Falta M02: el control no termina el programa ni lo rebobina; queda esperando y se muestra “SIN M02”.', 'Agrega M02 en la última fila.')],
  [/^BLOQUES DESPUÉS DEL FIN/, E('Después de M02/M30 el programa termina.', 'Esas filas nunca se ejecutan.', 'Muévelas antes de M02 o bórralas.')],
  [/^AVANCE NO PROGRAMADO/, E('Un movimiento de corte (G1/G2/G3) necesita un avance F definido antes.',
    'Sin F el control no sabe a qué velocidad cortar: alarma y la máquina no avanza.', 'Agrega F (ej. F0.15) en el primer G1.')],
  [/^AVANCE INVÁLIDO/, E('F debe ser mayor que cero.', 'Los carros no se mueven: el programa queda detenido.', 'Escribe un avance positivo.')],
  [/^HUSILLO PRINCIPAL DETENIDO/, E('Para cortar el husillo debe girar: falta M3 (o M4) con S antes del corte.',
    'Husillo parado: la herramienta empuja la barra sin cortar; se rompe el inserto o la pieza se suelta del plato.', 'Programa S… M3 antes del primer movimiento de corte.')],
  [/^SIN HERRAMIENTA/, E('No se seleccionó ninguna herramienta con T antes de cortar.', 'Corta la herramienta que esté en posición, con correctores equivocados: medidas incorrectas o choque.', 'Agrega T0101 (o la que corresponda) antes del corte.')],
  [/^ROTACIÓN NO PROGRAMADA/, E('M3/M4 sin un valor S de rotación.', 'El husillo gira a la última S memorizada, que puede ser muy alta o cero.', 'Escribe S junto a M3 (S1000 M3).')],
  [/^PRIMER MOVIMIENTO EN AVANCE/, E('El primer movimiento debería ser un G0 de aproximación.', 'La herramienta se acerca lentamente desde lejos: se pierde tiempo y no hay posición segura conocida.', 'Empieza con G0 X… Z… lejos de la pieza.')],
  [/^G02\/G03 - DEF\. ILEGAL/, E('El arco es geométricamente imposible: el radio no alcanza a unir el punto inicial y final, o falta R / I-K.',
    'Alarma de arco: el control se detiene en esa fila y la pieza queda a medio hacer.', 'Revisa R (debe ser ≥ mitad de la distancia entre puntos) o el punto final.')],
  [/^REQUIERE RADIO POSITIVO/, E('El R de un arco debe ser positivo.', 'Alarma de arco.', 'Usa R positivo.')],
  [/^ROTACIÓN ALTA EN ROSCA/, E('En roscado el Mach 9 limita la rotación a 3000 / paso (rpm).',
    'El carro no alcanza a seguir al husillo: filete deformado, paso irregular y rotura de la herramienta de roscar.', 'Baja S por debajo del máximo indicado.')],
  [/^ROSCA CON G96/, E('El roscado necesita rotación fija (G97).', 'Al cambiar la rpm con el diámetro, cada pasada entra desfasada: rosca destruida.', 'Programa G97 y S fija antes de roscar.')],
  [/^G(33|37|76)/, E('El ciclo de roscado tiene datos incompletos o imposibles.', 'Alarma de ciclo: no se hace la rosca.', 'Revisa X, Z, K y las profundidades del ciclo.')],
  [/^HERR\. #\d+ S\/DEF/, E('La herramienta no está en la tabla de herramientas del simulador.', 'En la máquina se usarían correctores vacíos: medidas erróneas.', 'Agrégala a la tabla de herramientas.')],
  [/^HERRAMIENTA INEXISTENTE/, E('La torreta tiene un número limitado de posiciones.', 'El control da alarma de herramienta y no gira la torreta.', 'Usa una posición válida (T01 a T08).')],
  [/^PROGRAMA EN PULGADAS/, E('G70 cambia las cotas a pulgadas.', 'Si fue sin querer, todas las cotas se multiplican por 25,4: choque seguro.', 'Usa G71 (mm) salvo que el plano esté en pulgadas.')],
  [/NO SIMULADO$/, E('Esta función existe en el Mach 9 pero el simulador no la reproduce.', 'En la máquina sí tiene efecto: revisa su resultado a mano.', 'Comprueba el resultado con el manual.')],
  [/^COMPENSACIÓN DE RADIO/, E('G41/G42 compensa el radio de punta; el simulador dibuja la punta teórica.', 'En conos y arcos la medida real puede diferir de lo dibujado.', 'Revisa con el radio de punta activado en la tabla de herramientas.')],
  // ---------- física ----------
  [/^COLISIÓN EN RÁPIDO/, E('Un G0 (avance rápido de 10 m/min) atraviesa material: los rápidos solo se usan en el aire.',
    'La herramienta entra en rápido al material: choque, rotura del inserto y del portaherramientas, daño de la pieza y posible daño de la torreta.', 'Retira primero en X (G0 X mayor) y luego mueve en Z, o usa G1 con F.')],
  [/^CHOQUE CON EL PLATO/, E('La herramienta pasa más allá de la cara de las garras del plato.',
    'La herramienta golpea las garras girando: rotura del inserto, garras marcadas y riesgo de que la pieza salga disparada.', 'Aumenta el saliente de la barra o corrige la Z del bloque.')],
  [/^PROFUNDIDAD MAYOR QUE ap/, E('La pasada corta más que la profundidad máxima (ap) elegida.',
    'Esfuerzo excesivo: vibración, mal acabado, desgaste rápido o rotura del inserto; con mucha diferencia, el motor se frena.', 'Agrega pasadas intermedias o reduce la profundidad.')],
  [/^SOBRECORTE/, E('La herramienta quitó material por dentro del perfil del plano.',
    'La pieza queda bajo medida: pieza rechazada (no se puede recuperar).', 'Revisa las cotas de esa zona o el radio de punta.')],
  [/^MATERIAL SOBRANTE/, E('Queda material por encima del perfil del plano.', 'La pieza queda sobre medida.', 'Agrega una pasada de acabado.')],
  [/^S CON PUNTO/, E('Según la clase, el Mach 9 interpreta una S con punto como velocidad de corte y calcula la rpm con 1000·Vc/(π·D).',
    'En diámetros chicos la rpm calculada se dispara y el husillo no la alcanza: el control da alarma o gira a una velocidad que no esperabas.', 'Escribe la rotación sin punto (S1000) o programa G96 a propósito.')],
  [/^ROTACIÓN EXCEDE EL MÁXIMO/, E('La Centur 30D gira de 4 a 4000 rpm.', 'El control limita o da alarma de husillo; el programa no se ejecuta como se escribió.', 'Usa S ≤ 4000.')],
  [/^ROTACIÓN MENOR QUE EL MÍNIMO/, E('La rotación mínima del husillo es 4 rpm.', 'El husillo no gira de forma estable.', 'Usa S ≥ 4.')],
  [/^G96 SIN LÍMITE/, E('Con velocidad de corte constante la rpm sube al acercarse al centro.', 'El husillo se dispara al máximo: vibración y peligro de que la pieza se suelte.', 'Programa G92 S… (límite de rpm) antes de G96.')],
  [/^G92 S MAYOR/, E('El límite de rotación no puede superar el máximo del husillo.', 'El límite no protege nada.', 'Usa G92 S4000 o menos.')],
  [/^FIN DE CURSO X|^CARRERA X/, E('La carrera del eje X es de 220 mm.', 'El carro llega al fin de curso: alarma y parada de ejes.', 'Revisa las cotas X.')],
  [/^CARRERA Z/, E('La carrera del eje Z es de 1065 mm.', 'El carro llega al fin de curso: alarma y parada.', 'Revisa las cotas Z.')],
  [/^DIÁMETRO MAYOR QUE EL VOLTEO/, E('El volteo sobre la bancada es Ø 350 mm.', 'La herramienta o la pieza golpearían la bancada.', 'Reduce el diámetro programado.')],
  [/^POTENCIA/, E('La pasada pide más potencia de la que entrega el motor de 10 hp (Nc = Ks·f·ap·Vc / 4500·η).',
    'El husillo se frena o se detiene con alarma de sobrecarga; el inserto puede romperse.', 'Reduce la profundidad, el avance o la velocidad de corte.')],
  // ---------- pieza en bruto ----------
  [/^PIEZA MAYOR QUE EL VOLTEO/, E('La pieza no cabe sobre la bancada (volteo Ø 350 mm).', 'La pieza golpearía la bancada al girar.', 'Usa una pieza más chica.')],
  [/^PIEZA MAYOR QUE EL Ø SOBRE/, E('Sobre el carro solo pasan Ø 200 mm.', 'La pieza choca con el carro si este se acerca.', 'Trabaja solo cerca del plato o reduce el diámetro.')],
  [/^PIEZA MAYOR QUE EL PLATO/, E('Las garras no abren tanto.', 'No se puede sujetar la pieza.', 'Invierte las garras o usa otro plato.')],
  [/^LA BARRA NO ENTRA/, E('El agujero del husillo es Ø 53 mm.', 'La barra no se puede introducir tanto en el plato.', 'Reduce el largo sujeto o usa barra ≤ Ø 53 mm.')],
  [/^PIEZA MÁS LARGA/, E('La distancia entre puntas es de 1000 mm.', 'La pieza no cabe en la máquina.', 'Corta la barra más corta.')],
  [/^SUJECIÓN CORTA/, E('Con poco largo sujeto las garras no sostienen bien la barra.', 'La barra puede salir disparada o vibrar.', 'Sujeta al menos medio diámetro (o más).')],
  [/^VOLADIZO LARGO/, E('Una barra muy salida del plato flexa con la fuerza de corte.', 'Vibración, conicidad y mal acabado; riesgo de doblar la barra.', 'Usa contrapunta o reduce el saliente.')],
  [/^BARRA TODA DENTRO/, E('No queda material fuera del plato para tornear.', 'No se puede mecanizar.', 'Reduce el largo sujeto.')],
  [/^PIEZA SIN MEDIDAS/, E('Faltan medidas de la pieza.', 'No se puede simular.', 'Completa diámetro y longitud.')]
];

export function explain(code) {
  for (const [re, e] of TABLE) if (re.test(code)) return e;
  return E('Regla del Mach 9 o de la máquina no cumplida.', 'Revisa la fila antes de ejecutarla en la máquina real.', '');
}
