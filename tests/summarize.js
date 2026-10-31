// Resume la salida del núcleo en datos comparables (para la prueba de oro).
import { PROGRAMS, CAM_CASES } from './fixtures/programs.js';
const r6 = v => (v == null || !Number.isFinite(v)) ? v : Math.round(v * 1e6) / 1e6;
const hashArr = a => { let h = 0; for (let i = 0; i < a.length; i++) h = (h * 31 + Math.round(a[i] * 1e4)) | 0; return h; };

export function summarize(M9, extra) {
  const setup = { barD: 25, barLen: 100, grip: 22, faceStock: 0.5, rapidFeed: 7500 };
  const out = {};
  const progs = Object.assign({}, PROGRAMS, { defecto: extra.DEFAULT_PROGRAM });
  for (const [k, text] of Object.entries(progs)) {
    const p = M9.parse(text, { maxDec: 2 });
    const run = M9.interpret(p, setup);
    const sim = new M9.Sim(run, setup); sim.runAll();
    out[k] = {
      blocks: p.blocks.map(b => b.code), name: p.name, pmsgs: p.msgs,
      moves: run.moves.map(m => [m.line, m.kind, r6(m.x0), r6(m.z0), r6(m.x1), r6(m.z1), r6(m.time), m.tool]),
      rmsgs: run.msgs, total: r6(run.total), events: run.events.length, toolChanges: run.toolChanges, rpmMax: r6(run.rpmMax),
      simR: hashArr(sim.r), coll: [...sim.mColl], chuck: [...sim.mChuck],
      depth: [...sim.mDepth].map(v => Math.round(v * 1000)), vol: r6(sim.removedVolume().v1),
      parted: sim.parted, threads: [...sim.threads.values()].map(t => [r6(t.root), r6(t.reach)])
    };
  }
  out.cam = CAM_CASES.map(c => {
    const P = Object.assign({ profileText: extra.DEFAULT_PROFILE }, c);
    const res = M9.cam(P);
    return { text: res.text, errors: res.rep.errors, warnings: res.rep.warnings, stats: res.rep.stats };
  });
  out.ks = ['SAE 1010–1025', 'Aluminio', 'Latón'].map(m => [0.05, 0.15, 0.3, 1].map(f => r6(M9.ksAt(m, f))));
  out.power = r6(M9.cutPower('SAE 1040–1045', 0.2, 1, 150));
  out.fmt = [0, 1, 1.5, -0.004, 12.345, 3.10001].map(v => M9.fmt(v));
  return JSON.parse(JSON.stringify(out));
}
