export const STYLES = /* css */ `
:host {
  display: block;
  --bg: #0e131d;
  --panel: #151b28;
  --panel-2: #1b2232;
  --panel-3: #232c40;
  --line: #2a344a;
  --text: #f2f5fb;
  --text-2: #b4bdd0;
  --text-3: #8591a8;
  --accent: #4aa3ff;
  --accent-bg: rgba(74,163,255,.16);
  --c-cancel: #f0473f;  --c-cancel-bg: rgba(240,71,63,.17);  --c-cancel-fg: #ff8a84;
  --c-room: #f59a23;    --c-room-bg: rgba(245,154,35,.17);    --c-room-fg: #ffbe66;
  --c-teacher: #e7c52b; --c-teacher-bg: rgba(231,197,43,.16); --c-teacher-fg: #f3d955;
  --c-subject: #a566f2; --c-subject-bg: rgba(165,102,242,.18);--c-subject-fg: #c9a2ff;
  --c-other: #a566f2;   --c-other-bg: rgba(165,102,242,.18);  --c-other-fg: #c9a2ff;
  --c-exam: #3fa3ff;    --c-exam-bg: rgba(63,163,255,.18);    --c-exam-fg: #7cc0ff;
  --ok: #3ccf7e;
  --shadow: 0 6px 24px rgba(0,0,0,.35);
  --r: 16px;
  color: var(--text);
  font-family: var(--paper-font-body1_-_font-family, Roboto, "Segoe UI", system-ui, sans-serif);
}
:host([data-theme="light"]) {
  --bg: #f3f5fa;
  --panel: #ffffff;
  --panel-2: #f6f8fc;
  --panel-3: #e9edf5;
  --line: #d9dfeb;
  --text: #172033;
  --text-2: #475069;
  --text-3: #6b768c;
  --accent: #1f7ae0;
  --accent-bg: rgba(31,122,224,.12);
  --c-cancel: #d93025;  --c-cancel-bg: rgba(217,48,37,.10);  --c-cancel-fg: #b3261e;
  --c-room: #e08600;    --c-room-bg: rgba(224,134,0,.12);    --c-room-fg: #a85f00;
  --c-teacher: #c9a400; --c-teacher-bg: rgba(201,164,0,.14); --c-teacher-fg: #8a6f00;
  --c-subject: #8a43e0; --c-subject-bg: rgba(138,67,224,.11);--c-subject-fg: #6d2fc0;
  --c-other: #8a43e0;   --c-other-bg: rgba(138,67,224,.11);  --c-other-fg: #6d2fc0;
  --c-exam: #1f7ae0;    --c-exam-bg: rgba(31,122,224,.11);   --c-exam-fg: #1760b5;
  --ok: #1e9d5b;
  --shadow: 0 4px 16px rgba(30,45,80,.10);
}
* { box-sizing: border-box; }
.ico { flex: none; display: block; }
button { font: inherit; color: inherit; cursor: pointer; }
.root { container-type: inline-size; container-name: smo; }
.card {
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: calc(var(--r) + 4px);
  padding: 16px;
  display: flex; flex-direction: column; gap: 14px;
  box-shadow: var(--shadow);
}
.body-wrap { display: flex; flex-direction: column; gap: 14px; min-width: 0; }

/* ---- header ---- */
.head { display: grid; grid-template-columns: auto 1fr auto; gap: 12px 16px; align-items: center; }
.head-main { display: flex; align-items: center; gap: 14px; min-width: 0; grid-column: 1; }
.logo { width: 58px; height: 58px; border-radius: 16px; background: linear-gradient(145deg,#25405f,#1a2c46); color: #8fc8ff; display: grid; place-items: center; border: 1px solid #34527a; flex: none; }
:host([data-theme="light"]) .logo { background: linear-gradient(145deg,#e1efff,#cfe3fb); color: #1f6fd0; border-color: #b8d3f3; }
.titles h2 { margin: 0; font-size: 1.7rem; line-height: 1.1; font-weight: 700; letter-spacing: -.01em; overflow-wrap: anywhere; }
.sub { margin-top: 6px; display: flex; gap: 8px; align-items: center; color: var(--text-2); font-size: 1.05rem; }
.head-badges { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; grid-column: 2; }
.head-controls { display: flex; gap: 10px; align-items: center; grid-column: 3; justify-self: end; flex-wrap: wrap; justify-content: flex-end; }
.hbadge { display: inline-flex; gap: 8px; align-items: center; padding: 6px 14px; border-radius: 999px; font-weight: 600; font-size: .98rem; border: 1px solid var(--line); background: var(--panel); color: var(--text-2); }
.hbadge.warn { color: var(--c-room-fg); background: var(--c-room-bg); border-color: color-mix(in srgb, var(--c-room) 55%, transparent); }
.hbadge.ok { color: var(--ok); background: color-mix(in srgb, var(--ok) 12%, transparent); border-color: color-mix(in srgb, var(--ok) 40%, transparent); }
.hbadge.neutral { background: var(--panel-2); }
.hbadge.small { padding: 2px 10px; font-size: .82rem; margin-left: 8px; vertical-align: middle; }
.seg { display: inline-flex; background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 4px; gap: 2px; }
.segbtn { display: inline-flex; align-items: center; gap: 8px; border: 1px solid transparent; background: transparent; padding: 9px 16px; border-radius: 11px; font-size: 1.05rem; color: var(--text-2); }
.segbtn.on { background: var(--accent-bg); color: var(--text); border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent) inset, 0 0 14px color-mix(in srgb, var(--accent) 30%, transparent); }
.segbtn:hover:not(.on) { background: var(--panel-2); }
.nav { display: inline-flex; gap: 8px; align-items: center; }
.iconbtn, .todaybtn { border: 1px solid var(--line); background: var(--panel); border-radius: 12px; height: 46px; min-width: 46px; display: grid; place-items: center; color: var(--text); }
.todaybtn { padding: 0 16px; font-size: 1rem; display: inline-flex; align-items: center; }
.iconbtn:hover, .todaybtn:hover { background: var(--panel-3); }
button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

/* ---- legend ---- */
.legend { display: flex; flex-direction: column; gap: 10px; }
.legend-title { color: var(--text-2); font-size: .95rem; }
.legend-pills { display: flex; gap: 10px; flex-wrap: wrap; }
.legend.wide { background: var(--panel); border: 1px solid var(--line); border-radius: var(--r); padding: 10px 12px; }
.legend.wide .legend-pills { display: grid; grid-template-columns: repeat(5, minmax(0,1fr)); gap: 8px; }
.lpill { display: inline-flex; align-items: center; gap: 10px; padding: 8px 14px; border-radius: 999px; border: 1px solid color-mix(in srgb, var(--pc) 55%, transparent); background: var(--pbg); color: var(--pfg); min-width: 0; }
.lpill b { font-weight: 600; color: var(--text); font-size: 1rem; }
.lpill small { color: var(--text-2); font-size: .85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lico { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; background: color-mix(in srgb, var(--pc) 28%, transparent); flex: none; }
.legend.wide .lpill { border: 0; background: transparent; padding: 2px 4px; }

.c-cancel { --pc: var(--c-cancel); --pbg: var(--c-cancel-bg); --pfg: var(--c-cancel-fg); }
.c-room { --pc: var(--c-room); --pbg: var(--c-room-bg); --pfg: var(--c-room-fg); }
.c-teacher { --pc: var(--c-teacher); --pbg: var(--c-teacher-bg); --pfg: var(--c-teacher-fg); }
.c-subject { --pc: var(--c-subject); --pbg: var(--c-subject-bg); --pfg: var(--c-subject-fg); }
.c-other { --pc: var(--c-other); --pbg: var(--c-other-bg); --pfg: var(--c-other-fg); }
.c-exam { --pc: var(--c-exam); --pbg: var(--c-exam-bg); --pfg: var(--c-exam-fg); }

/* ---- tiles ---- */
.tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
.tile { display: flex; gap: 14px; align-items: center; padding: 14px 16px; background: var(--panel); border: 1px solid var(--line); border-radius: var(--r); min-width: 0; }
.tile-ico { color: var(--text-2); }
.t-start .tile-ico { color: var(--ok); }
.t-end .tile-ico { color: #8fc8ff; }
.t-current .tile-ico { color: var(--accent); }
.tile-label { color: var(--text-2); font-size: .98rem; }
.tile-value { font-size: 1.9rem; font-weight: 700; line-height: 1.15; overflow-wrap: anywhere; }
.t-current .tile-value { font-size: 1.3rem; }
.section-title { font-size: 1.1rem; font-weight: 600; color: var(--text-2); }

/* ---- lesson ---- */
.list { display: flex; flex-direction: column; gap: 10px; }
.lwrap { min-width: 0; }
.lesson {
  position: relative; width: 100%; text-align: left;
  display: flex; align-items: center; gap: 14px;
  background: var(--panel); border: 1px solid var(--line); border-radius: 14px;
  padding: 12px 14px 12px 16px; overflow: hidden;
}
.lesson::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 5px; background: var(--stripe, transparent); }
.lesson.changed { background: color-mix(in srgb, var(--pc, transparent) 10%, var(--panel)); border-color: color-mix(in srgb, var(--pc, var(--line)) 35%, var(--line)); }
.lesson.changed:has(.badge.c-cancel) { --pc: var(--c-cancel); }
.lesson:hover { filter: brightness(1.06); }
.lesson.now { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent), 0 0 18px color-mix(in srgb, var(--accent) 38%, transparent); background: color-mix(in srgb, var(--accent) 12%, var(--panel)); }
.num { flex: none; width: 44px; height: 44px; display: grid; place-items: center; font-size: 1.35rem; font-weight: 700; background: var(--panel-3); border-radius: 12px; color: var(--text); }
.lesson.cancelled .num { background: var(--c-cancel-bg); color: var(--c-cancel-fg); }
.lesson.now .num { background: var(--accent); color: #fff; }
.body { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1; }
.time { color: var(--text-2); font-size: .98rem; font-variant-numeric: tabular-nums; }
.subj { font-size: 1.35rem; font-weight: 700; line-height: 1.15; overflow-wrap: anywhere; }
.lesson.cancelled .subj { text-decoration: line-through; text-decoration-thickness: 2px; color: var(--text-2); }
.lesson.cancelled .meta { text-decoration: line-through; opacity: .75; }
.meta { display: flex; flex-wrap: wrap; gap: 4px 18px; color: var(--text-2); font-size: 1rem; }
.m { display: inline-flex; gap: 6px; align-items: center; min-width: 0; }
.m.small { font-size: .9rem; color: var(--text-3); }
.chg { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; font-size: 1rem; color: var(--pfg); }
.chg .was { text-decoration: line-through; opacity: .8; color: var(--text-2); }
.chg .now { color: var(--pfg); font-weight: 700; }
.chg .arr { color: var(--pfg); display: inline-flex; }
.badges { display: flex; flex-direction: column; gap: 6px; align-items: flex-end; flex: none; }
.badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 11px; border-radius: 999px; font-size: .92rem; font-weight: 600; border: 1px solid color-mix(in srgb, var(--pc) 70%, transparent); background: var(--pbg); color: var(--pfg); white-space: nowrap; }

/* row variant (day / compact): room right aligned */
.lesson.row { padding: 14px 18px 14px 20px; }
.lesson.row .body { display: grid; grid-template-columns: minmax(0,1fr) auto; column-gap: 20px; }
.lesson.row .body > .time { grid-column: 1 / -1; }
.lesson.row .meta { display: contents; }
.lesson.row .meta .teacher { grid-column: 1; grid-row: 3; }
.lesson.row .meta .room { grid-column: 2; grid-row: 3; justify-self: end; }
.lesson.row .chg { grid-column: 1 / -1; }
.lesson.row .chg.c-room { grid-column: 2; grid-row: 3; justify-self: end; }
.lesson.row .subj { font-size: 1.5rem; }

/* detail panel */
.detail { margin: 6px 4px 0; padding: 12px 14px; background: var(--panel-2); border: 1px dashed var(--line); border-radius: 12px; }
.detail-badges { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
.detail dl { margin: 0; display: grid; grid-template-columns: max-content 1fr; gap: 4px 14px; font-size: .98rem; }
.detail dt { color: var(--text-3); }
.detail dd { margin: 0; overflow-wrap: anywhere; }

/* ---- week grid ---- */
.week { display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); gap: 8px 10px; align-items: stretch; }
.dhead { grid-column: calc(var(--d) + 1); grid-row: 1; background: var(--panel); border: 1px solid var(--line); border-radius: var(--r); padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.dhead.today { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent), 0 0 18px color-mix(in srgb, var(--accent) 30%, transparent); background: linear-gradient(var(--accent-bg), var(--panel)); }
.dname b { font-size: 1.45rem; display: block; line-height: 1.1; }
.dname span { color: var(--text-2); font-size: 1rem; }
.dchip { align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; padding: 3px 11px; border-radius: 999px; font-size: .88rem; font-weight: 600; border: 1px solid var(--line); }
.dchip.ok { color: var(--ok); border-color: color-mix(in srgb, var(--ok) 40%, transparent); background: color-mix(in srgb, var(--ok) 10%, transparent); }
.dchip.warn { color: var(--c-room-fg); border-color: color-mix(in srgb, var(--c-room) 55%, transparent); background: var(--c-room-bg); }
.dchip.off { color: var(--text-3); }
.cell { grid-column: calc(var(--d) + 1); grid-row: calc(var(--p) + 2); display: flex; flex-direction: column; gap: 8px; min-width: 0; padding: 0; }
.cell.today { border-radius: 14px; }
.lesson.grid { align-items: flex-start; flex-wrap: wrap; gap: 8px 10px; padding: 10px 10px 10px 14px; height: 100%; }
.lesson.grid .num { width: 32px; height: 32px; font-size: 1.05rem; border-radius: 10px; }
.lesson.grid .subj { font-size: 1.15rem; }
.lesson.grid .time { font-size: .86rem; }
.lesson.grid .badges { flex-direction: row; flex-wrap: wrap; align-items: flex-start; width: 100%; }
.lesson.grid .badge { font-size: .8rem; padding: 2px 9px; }
.lesson.grid .meta { font-size: .92rem; gap: 2px 12px; }
.cell .lwrap { height: 100%; display: flex; flex-direction: column; }
.cell .lwrap > .lesson { flex: 1; }

/* ---- summary / footer ---- */
.summary { display: flex; flex-wrap: wrap; gap: 10px 22px; align-items: center; background: var(--panel); border: 1px solid var(--line); border-radius: var(--r); padding: 12px 16px; }
.sum-title { display: flex; gap: 10px; align-items: center; color: var(--text); font-size: 1.15rem; }
.sum-items { display: flex; flex-wrap: wrap; gap: 8px 22px; color: var(--text-2); font-size: 1rem; }
.sum-i { display: inline-flex; gap: 8px; align-items: center; }
.sum-i .dotc { width: 22px; height: 22px; border-radius: 50%; background: var(--pbg); border: 2px solid var(--pc); }
.foot { display: flex; justify-content: space-between; align-items: center; gap: 10px 20px; flex-wrap: wrap; border-top: 1px solid var(--line); padding-top: 12px; color: var(--text-2); font-size: 1.05rem; }
.foot-info { display: inline-flex; gap: 10px; align-items: center; }
.foot-info b { color: var(--text); }
.stand { display: inline-flex; gap: 8px; align-items: center; color: var(--text-3); }
.stand .dot { width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; color: #fff; background: var(--ok); }
.stand.bad .dot { background: var(--c-room); }
.banner { display: flex; gap: 10px; align-items: flex-start; padding: 10px 14px; border-radius: 12px; font-size: .98rem; border: 1px solid var(--line); }
.banner.warn { color: var(--c-room-fg); background: var(--c-room-bg); border-color: color-mix(in srgb, var(--c-room) 50%, transparent); }
.banner.info { color: var(--text-2); background: var(--panel-2); }
.empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; text-align: center; padding: 34px 16px; color: var(--text-2); background: var(--panel); border: 1px dashed var(--line); border-radius: var(--r); }
.empty.err { color: var(--c-room-fg); }
.empty-title { font-size: 1.4rem; font-weight: 700; color: var(--text); }
.empty-next { margin-top: 6px; color: var(--accent); font-weight: 600; }
.all-good { display: flex; gap: 12px; align-items: center; padding: 16px; border-radius: var(--r); color: var(--ok); background: color-mix(in srgb, var(--ok) 10%, var(--panel)); border: 1px solid color-mix(in srgb, var(--ok) 35%, transparent); font-size: 1.2rem; font-weight: 600; }

/* ---- responsive (container based) ---- */
@container smo (max-width: 1100px) {
  .head { grid-template-columns: 1fr; }
  .head-badges, .head-controls { grid-column: 1; justify-self: start; flex-direction: row; flex-wrap: wrap; }
  .legend.wide .legend-pills { grid-template-columns: repeat(auto-fit, minmax(150px,1fr)); }
  .lpill small { display: none; }
}
@container smo (max-width: 820px) {
  .week { grid-template-columns: 1fr; gap: 8px; }
  .dhead { grid-column: 1; grid-row: auto; order: calc(var(--d) * 100); flex-direction: row; align-items: center; justify-content: space-between; margin-top: 10px; }
  .dname b { display: inline; margin-right: 8px; font-size: 1.25rem; }
  .cell { grid-column: 1; grid-row: auto; order: calc(var(--d) * 100 + var(--p) + 1); }
  .lesson.grid { flex-wrap: nowrap; align-items: center; }
  .lesson.grid .badges { width: auto; flex-direction: column; align-items: flex-end; }
}
@container smo (max-width: 560px) {
  .card { padding: 12px; gap: 12px; border-radius: 18px; }
  .titles h2 { font-size: 1.35rem; }
  .logo { width: 48px; height: 48px; }
  .segbtn { padding: 8px 12px; }
  .segbtn span { display: none; }
  .segbtn.on span { display: inline; }
  .subj, .lesson.row .subj { font-size: 1.2rem; }
  .lesson.row .body { grid-template-columns: 1fr; }
  .lesson.row .meta .room { grid-column: 1; grid-row: auto; justify-self: start; }
  .lesson.row .meta .teacher { grid-row: auto; }
  .lesson.row .meta { display: flex; }
  .lesson.row .chg.c-room { grid-column: 1; grid-row: auto; justify-self: start; }
  .tiles { grid-template-columns: repeat(auto-fit, minmax(96px, 1fr)); gap: 8px; }
  .tile { padding: 10px 12px; gap: 8px; }
  .tile-ico { display: none; }
  .tile-value { font-size: 1.5rem; }
  .badges { align-items: flex-end; }
  .legend-pills .lpill small { display: none; }
}
@container smo (min-width: 1500px) {
  .card { padding: 22px; gap: 18px; }
  .subj { font-size: 1.5rem; }
  .lesson.grid .subj { font-size: 1.3rem; }
}
@media (prefers-reduced-motion: no-preference) {
  .lesson, .segbtn { transition: background .15s, border-color .15s, filter .15s; }
}
`;
