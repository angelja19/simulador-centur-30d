#!/bin/sh
# uso: scripts/shot.sh salida.png ancho alto [js] [espera] [url]
cd "$(dirname "$0")/.."
node -e "require('fs').writeFileSync('work/shot.json', JSON.stringify([process.argv[6]||'http://localhost:5179/', process.argv[1], process.argv[2], process.argv[3], process.argv[4]||'', process.argv[5]||'900']))" "$1" "$2" "$3" "$4" "$5" "$6"
./node_modules/electron/dist/electron.exe scripts/shot.cjs 2>/dev/null
