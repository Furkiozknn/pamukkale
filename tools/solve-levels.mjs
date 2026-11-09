// Offline level checker and solver for Pamukkale.
// It reads the SIM and LEVELS blocks straight from ../index.html, so the bot and the player
// always use the same water rules. Usage: node tools/solve-levels.mjs [levelNumber ...]
// Prints one JSON line per level: the placements (tool, x, y) that fill every pool, or FAILED.
// Levels with sluice gates (def.gates) are solved by solveGates(): it also prints the gate toggles
// [x, y, tick], the tick window in which each toggle still works, and whether timing is required.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, '..', 'index.html'), 'utf8');
const block = (a, b) => html.slice(html.indexOf(a) + a.length, html.indexOf(b));
const PSim = new Function(`${block('/* SIM-BEGIN */', '/* SIM-END */')}\nreturn PSim;`)();
// LEVELS_FILE lets a draft table be checked before it is pasted into index.html
const levelsSource = process.env.LEVELS_FILE
  ? readFileSync(process.env.LEVELS_FILE, 'utf8')
  : block('/* LEVELS-BEGIN */', '/* LEVELS-END */');
const LEVELS = new Function(`${levelsSource}\nreturn LEVELS;`)();
LEVELS.forEach((def, k) => {
  if (def.rows.length !== def.n || def.rows.some(r => r.length !== def.n)) throw new Error(`level ${k + 1}: rows do not match n=${def.n}`);
});

const BEAM = 40;
const TOOLS = ['stone', 'dam', 'split'];

function simulate(def, placements) {
  const st = PSim.create(def);
  for (const [tool, x, y] of placements) PSim.place(st, tool, y * def.n + x);
  const s = PSim.run(st);
  return { done: s.done, fill: s.fill, tick: st.tick, wasted: st.wasted, emitted: st.emitted };
}

function key(placements) {
  return placements.map(p => p.join(':')).sort().join('|');
}

function solve(def) {
  const budget = def.tools;
  const naive = simulate(def, []);
  if (naive.done) return { placements: [], tick: naive.tick, wasted: naive.wasted, emitted: naive.emitted, naive: true };
  const cellsFree = (placements) => {
    const taken = new Set(placements.map(p => p[1] + ',' + p[2]));
    const spring = def.spring[0] + ',' + def.spring[1];
    return (x, y) => !taken.has(x + ',' + y) && (x + ',' + y) !== spring;
  };
  let beam = [{ placements: [], score: 0 }];
  const total = TOOLS.reduce((a, t) => a + (budget[t] || 0), 0);
  for (let depth = 1; depth <= total; depth++) {
    const seen = new Set();
    const next = [];
    let best = null;
    for (const node of beam) {
      const used = { stone: 0, dam: 0, split: 0 };
      for (const [t] of node.placements) used[t]++;
      const free = cellsFree(node.placements);
      for (const tool of TOOLS) {
        if (used[tool] >= (budget[tool] || 0)) continue;
        for (let y = 0; y < def.n; y++) for (let x = 0; x < def.n; x++) {
          if (!free(x, y)) continue;
          const placements = [...node.placements, [tool, x, y]];
          const k = key(placements);
          if (seen.has(k)) continue;
          seen.add(k);
          const r = simulate(def, placements);
          if (r.done) {
            if (!best || r.tick < best.tick) best = { placements, tick: r.tick, wasted: r.wasted, emitted: r.emitted };
            continue;
          }
          const score = r.fill - 0.2 * (r.emitted ? r.wasted / r.emitted : 0);
          next.push({ placements, score });
        }
      }
    }
    if (best) return best;
    next.sort((a, b) => b.score - a.score);
    beam = next.slice(0, BEAM);
    if (!beam.length) break;
  }
  return null;
}

// ---------- sluice gates: the player may open or close a gate while the water runs ----------
const GATE_STEP = 5;   // toggle ticks searched: every 5th tick (a quarter second of game time)

function simulateTimed(def, placements, toggles) {
  const st = PSim.create(def);
  for (const [tool, x, y] of placements) PSim.place(st, tool, y * def.n + x);
  let s = PSim.status(st);
  while (!s.done && st.tick < def.time) {
    for (const [x, y, t] of toggles) if (st.tick === t) PSim.toggle(st, y * def.n + x);
    PSim.step(st);
    s = PSim.status(st);
  }
  return { done: s.done, fill: s.fill, tick: st.tick, wasted: st.wasted, emitted: st.emitted };
}

// every tool set within the level's budget (gate levels keep budgets small, so this is exhaustive)
function toolSets(def) {
  const sets = [[]];
  const isGate = (x, y) => def.gates.some(g => g[0] === x && g[1] === y);
  for (const tool of TOOLS) for (let c = 0; c < (def.tools[tool] || 0); c++) {
    const add = [];
    for (const ts of sets) for (let y = 0; y < def.n; y++) for (let x = 0; x < def.n; x++) {
      if ((x === def.spring[0] && y === def.spring[1]) || isGate(x, y) || ts.some(p => p[1] === x && p[2] === y)) continue;
      add.push([...ts, [tool, x, y]]);
    }
    sets.push(...add);
  }
  return sets;
}

// toggle schedules: each gate is left alone or toggled once (or twice, for a level with one gate)
function* schedules(def) {
  const g = def.gates, opts = [];
  for (let t = GATE_STEP; t < def.time; t += GATE_STEP) opts.push(t);
  const twice = g.length === 1;
  function* rec(k, acc) {
    if (k === g.length) { yield acc; return; }
    yield* rec(k + 1, acc);
    for (const a of opts) {
      yield* rec(k + 1, [...acc, [g[k][0], g[k][1], a]]);
      if (twice) for (const b of opts) if (b > a) yield* rec(k + 1, [...acc, [g[k][0], g[k][1], a], [g[k][0], g[k][1], b]]);
    }
  }
  yield* rec(0, []);
}

function solveGates(def) {
  const sets = toolSets(def);
  // timing is required when no fixed gate setting (each gate as built, or flipped before the start)
  // fills every pool with any tool set the budget allows
  const fixed = [];
  const rec = (k, acc) => { if (k === def.gates.length) { fixed.push(acc); return; } rec(k + 1, acc); rec(k + 1, [...acc, [def.gates[k][0], def.gates[k][1], 0]]); };
  rec(0, []);
  const needsTiming = !fixed.some(f => sets.some(ts => simulateTimed(def, ts, f).done));
  // fewest tools first, then the schedule that finishes earliest
  const bySize = [...sets].sort((a, b) => a.length - b.length);
  let best = null;
  for (const ts of bySize) {
    if (best && ts.length > best.placements.length) break;
    for (const toggles of schedules(def)) {
      const r = simulateTimed(def, ts, toggles);
      if (r.done && (!best || toggles.length < best.toggles.length || (toggles.length === best.toggles.length && r.tick < best.tick))) {
        best = { placements: ts, toggles, tick: r.tick, wasted: r.wasted, emitted: r.emitted };
      }
    }
  }
  if (!best) return null;
  // window: how far each toggle can move (others fixed, order kept) and still fill every pool
  best.window = best.toggles.map((tg, k) => {
    const works = t => simulateTimed(def, best.placements, best.toggles.map((o, j) => (j === k ? [o[0], o[1], t] : o))).done;
    const prev = best.toggles.slice(0, k).filter(o => o[0] === tg[0] && o[1] === tg[1]).map(o => o[2]);
    const next = best.toggles.slice(k + 1).filter(o => o[0] === tg[0] && o[1] === tg[1]).map(o => o[2]);
    const min = prev.length ? Math.max(...prev) + 1 : 1, max = next.length ? Math.min(...next) - 1 : def.time - 1;
    let lo = tg[2], hi = tg[2];
    while (lo - 1 >= min && works(lo - 1)) lo--;
    while (hi + 1 <= max && works(hi + 1)) hi++;
    return [lo, hi];
  });
  best.needsTiming = needsTiming;
  return best;
}

const want = process.argv.slice(2).map(Number);
for (let k = 0; k < LEVELS.length; k++) {
  if (want.length && !want.includes(k + 1)) continue;
  const t0 = Date.now();
  const gated = !!(LEVELS[k].gates && LEVELS[k].gates.length);
  const r = gated ? solveGates(LEVELS[k]) : solve(LEVELS[k]);
  const out = !r ? { level: k + 1, result: 'FAILED', ms: Date.now() - t0 }
    : gated ? { level: k + 1, sol: r.placements, gates: r.toggles, window: r.window, needsTiming: r.needsTiming, tick: r.tick, wastedPct: +(100 * r.wasted / r.emitted).toFixed(1), ms: Date.now() - t0 }
    : { level: k + 1, sol: r.placements, tick: r.tick, wastedPct: +(100 * r.wasted / r.emitted).toFixed(1), ms: Date.now() - t0 };
  console.log(JSON.stringify(out));
}
