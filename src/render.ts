import { addDays, hhmmToMinutes, isoWeek, isWeekend, mondayOf, parseISODate, weekdayOf } from "./dates";
import { icon } from "./icons";
import { fmt, type Strings } from "./i18n";
import {
  changedLessons,
  countChanges,
  currentLessons,
  dayTimes,
  getDay,
  lessonsByPeriod,
  nextLessons,
  visibleLessons,
} from "./model";
import type { CardConfig, Change, ChangeType, Day, Lesson, Schedule, ViewMode } from "./types";

export interface RenderState {
  cfg: Required<Omit<CardConfig, "type" | "entity" | "student_id" | "title">> & Pick<CardConfig, "title">;
  t: Strings;
  locale: string;
  schedule: Schedule | null;
  studentName: string;
  error: string | null;
  loading: boolean;
  view: ViewMode;
  /** Selected day (day view) or any date inside the shown week. */
  date: string;
  today: string;
  nowMin: number;
  expanded: Set<string>;
  hasMultipleViews: boolean;
}

export const esc = (s: unknown): string =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const TYPES: ChangeType[] = ["cancel", "room", "teacher", "subject", "exam"];
const TYPE_ICON: Record<ChangeType, string> = {
  cancel: "cross",
  room: "pin",
  teacher: "person",
  subject: "swap",
  other: "swap",
  exam: "doc",
};

function typeLabel(t: Strings, c: ChangeType): string {
  return t[c];
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------
function fmtDate(iso: string, locale: string, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(locale, { timeZone: "UTC", ...opts }).format(parseISODate(iso));
}

export function weekdayName(iso: string, locale: string, style: "long" | "short" = "long"): string {
  return fmtDate(iso, locale, { weekday: style });
}

export function formatWeekRange(monday: string, friday: string, locale: string): string {
  const { week } = isoWeek(monday);
  const a = parseISODate(monday);
  const b = parseISODate(friday);
  const sameMonth = a.getUTCMonth() === b.getUTCMonth();
  const dayA = fmtDate(monday, locale, { day: "numeric" });
  const left = sameMonth ? `${dayA}.` : fmtDate(monday, locale, { day: "numeric", month: "long" });
  const right = fmtDate(friday, locale, { day: "numeric", month: "long", year: "numeric" });
  const kw = locale.startsWith("de") ? "KW" : "CW";
  return `${left}–${right} (${kw} ${week})`;
}

function fmtTime(l: Lesson, s: Schedule): string {
  let start = l.start;
  let end = l.end;
  if (!start || !end) {
    const p = s.periods.find((x) => x.period === l.period);
    start = start ?? p?.start ?? null;
    end = end ?? p?.end ?? null;
  }
  return start && end ? `${start} – ${end}` : (start ?? "");
}

function relativeTime(iso: string | null, t: Strings, locale: string, now: Date = new Date()): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Math.round((now.getTime() - d.getTime()) / 60000);
  if (diff < 1) return t.ago_now;
  if (diff < 60) return fmt(t.ago_min, { n: diff });
  if (diff < 360) return fmt(t.ago_hours, { n: Math.round(diff / 60) });
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return `${t.today.toLowerCase()}, ${time}`;
  return `${d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit" })} ${time}`;
}

function changesLabel(n: number, t: Strings, kind: "today" | "week" | "day"): string {
  if (kind === "today") return n === 0 ? t.today_no_changes : n === 1 ? t.today_change_1 : fmt(t.today_changes, { n });
  if (kind === "week") return n === 0 ? t.week_no_changes : n === 1 ? t.week_change_1 : fmt(t.week_changes, { n });
  return n === 0 ? t.no_changes : n === 1 ? t.change_1 : fmt(t.changes_n, { n });
}

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------
function badge(type: ChangeType, t: Strings, label?: string): string {
  return `<span class="badge c-${type}">${icon(TYPE_ICON[type], 13)}<span>${esc(label ?? typeLabel(t, type))}</span></span>`;
}

function stripe(changes: Change[]): string {
  if (!changes.length) return "";
  const colors = changes.map((c) => `var(--c-${c.type})`);
  if (colors.length === 1) return `--stripe:${colors[0]}`;
  const step = 100 / colors.length;
  const stops = colors.map((c, i) => `${c} ${i * step}% ${(i + 1) * step}%`).join(",");
  return `--stripe:linear-gradient(to bottom,${stops})`;
}

function changeLines(l: Lesson, t: Strings): string {
  const rows: string[] = [];
  for (const c of l.changes) {
    if (c.type === "room" && (c.from || c.to)) {
      rows.push(arrowLine("room", c.from, c.to));
    } else if (c.type === "teacher" && (c.from || c.to)) {
      rows.push(arrowLine("teacher", c.from, c.to));
    } else if (c.type === "subject" && c.from) {
      rows.push(`<div class="chg c-subject"><span>${esc(fmt(t.instead_of, { x: c.from }))}</span></div>`);
    } else if (c.type === "exam" && c.text) {
      rows.push(`<div class="chg c-exam"><span>${esc(c.text)}${c.to ? ` · ${esc(c.to)}` : ""}</span></div>`);
    } else if (c.type === "other" && c.text) {
      rows.push(`<div class="chg c-other"><span>${esc(c.text)}</span></div>`);
    }
  }
  return rows.join("");
}

function arrowLine(type: ChangeType, from?: string, to?: string): string {
  const f = from ? `<s class="was">${esc(from)}</s>` : "";
  const n = to ? `<b class="now">${esc(to)}</b>` : "";
  const arrow = f && n ? `<span class="arr">${icon("arrow", 12)}</span>` : "";
  return `<div class="chg c-${type}">${f}${arrow}${n}</div>`;
}

function metaLine(l: Lesson, st: RenderState, wide: boolean): string {
  const parts: string[] = [];
  const hideTeacher = l.changes.some((c) => c.type === "teacher");
  const hideRoom = l.changes.some((c) => c.type === "room");
  if (st.cfg.show_teacher && l.teachers.length && !hideTeacher)
    parts.push(`<span class="m teacher">${icon("person", 14)}<span>${esc(l.teachers.join(", "))}</span></span>`);
  if (st.cfg.show_room && l.rooms.length && !hideRoom)
    parts.push(`<span class="m room">${icon(wide ? "door" : "pin", 14)}<span>${esc(l.rooms.join(", "))}</span></span>`);
  return parts.length ? `<div class="meta">${parts.join("")}</div>` : "";
}

function isNow(l: Lesson, st: RenderState): boolean {
  return (
    l.date === st.today && l.startMin !== null && l.endMin !== null && st.nowMin >= l.startMin && st.nowMin < l.endMin
  );
}

function detailPanel(l: Lesson, st: RenderState): string {
  const t = st.t;
  const rows: [string, string][] = [];
  rows.push([t.subject_label, l.subjectFull + (l.subject && l.subject !== l.subjectFull ? ` (${l.subject})` : "")]);
  if (l.group) rows.push([t.group, l.group]);
  if (st.schedule) {
    const time = fmtTime(l, st.schedule);
    rows.push([t.time_label, `${l.period}. ${t.period_label}${time ? " · " + time : ""}`]);
  }
  if (l.teachers.length) rows.push([t.teacher_label, l.teachers.join(", ")]);
  if (l.rooms.length) rows.push([t.room_label, l.rooms.join(", ")]);
  const o = l.original;
  if (o && l.changes.some((c) => c.type !== "exam")) {
    const bits = [o.subject_full || o.subject, o.teachers.join(", "), o.rooms.join(", ")].filter(Boolean);
    if (bits.length) rows.push([t.planned, bits.join(" · ")]);
  }
  for (const c of l.changes) {
    if (c.type === "exam") rows.push([t.exam, [c.text, c.to].filter(Boolean).join(" · ")]);
  }
  if (l.notes.length) rows.push([t.notes, l.notes.join(" · ")]);
  const badges = l.changes.map((c) => badge(c.type, st.t)).join("");
  return `<div class="detail">${badges ? `<div class="detail-badges">${badges}</div>` : ""}<dl>${rows
    .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`)
    .join("")}</dl></div>`;
}

type LessonVariant = "grid" | "row";

/** One lesson as card. `grid` = week cell, `row` = day/compact row. */
export function lessonCard(l: Lesson, st: RenderState, variant: LessonVariant): string {
  const t = st.t;
  const s = st.schedule!;
  const cls = ["lesson", variant, l.cancelled ? "cancelled" : "", l.changes.length ? "changed" : "", isNow(l, st) ? "now" : ""];
  if (l.kind === "event") cls.push("event");
  const style = stripe(l.changes);
  const time = st.cfg.show_times ? fmtTime(l, s) : "";
  const open = st.expanded.has(l.id);
  const title = l.subjectFull || l.subject || (l.kind === "event" ? t.event : "?");
  const badges = l.changes.map((c) => badge(c.type, t)).join("");
  const expandable = st.cfg.expandable;
  const body = `
    <span class="num">${esc(l.period)}</span>
    <span class="body">
      ${time ? `<span class="time">${esc(time)}</span>` : ""}
      <span class="subj" title="${esc(title)}">${esc(title)}</span>
      ${changeLines(l, t)}
      ${metaLine(l, st, variant === "row")}
    </span>
    ${badges ? `<span class="badges">${badges}</span>` : ""}`;
  const attrs = expandable
    ? `type="button" data-lesson="${esc(l.id)}" aria-expanded="${open}"`
    : `type="button" tabindex="-1"`;
  return `<div class="lwrap ${open ? "open" : ""}"><button class="${cls.filter(Boolean).join(" ")}" style="${style}" ${attrs}>${body}</button>${
    open ? detailPanel(l, st) : ""
  }</div>`;
}

function pill(type: ChangeType, t: Strings, withDesc: boolean): string {
  return `<span class="lpill c-${type}"><span class="lico">${icon(TYPE_ICON[type], 15)}</span><b>${esc(typeLabel(t, type))}</b>${
    withDesc ? `<small>${esc((t as any)[type + "_desc"])}</small>` : ""
  }</span>`;
}

function legend(st: RenderState, wide: boolean): string {
  if (!st.cfg.show_legend) return "";
  return `<div class="legend ${wide ? "wide" : ""}">${wide ? "" : `<div class="legend-title">${esc(st.t.legend)}</div>`}<div class="legend-pills">${TYPES.map((x) => pill(x, st.t, wide)).join("")}</div></div>`;
}

function tile(iconName: string, label: string, value: string, cls = ""): string {
  return `<div class="tile ${cls}"><span class="tile-ico">${icon(iconName, 22)}</span><div><div class="tile-label">${esc(label)}</div><div class="tile-value">${esc(value)}</div></div></div>`;
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------
function viewSwitch(st: RenderState): string {
  const t = st.t;
  const labels: Record<ViewMode, string> = { compact: t.compact, day: t.day, week: t.week };
  const icons: Record<ViewMode, string> = { compact: "layers", day: "clock", week: "calendar" };
  if (!st.hasMultipleViews) return "";
  const views = st.cfg.views;
  return `<div class="seg" role="tablist">${views
    .map(
      (v) =>
        `<button class="segbtn ${st.view === v ? "on" : ""}" role="tab" aria-selected="${st.view === v}" data-view="${v}">${icon(icons[v], 17)}<span>${esc(labels[v])}</span></button>`,
    )
    .join("")}</div>`;
}

function navButtons(st: RenderState): string {
  if (st.view === "compact") return "";
  return `<div class="nav"><button class="iconbtn" data-nav="-1" aria-label="${esc(st.t.prev)}">${icon("left", 20)}</button><button class="todaybtn" data-nav="today">${esc(st.t.today)}</button><button class="iconbtn" data-nav="1" aria-label="${esc(st.t.next)}">${icon("right", 20)}</button></div>`;
}

export function weekDays(st: RenderState): Day[] {
  const s = st.schedule!;
  const monday = mondayOf(st.date);
  const out: Day[] = [];
  for (let i = 0; i < 7; i++) {
    const d = getDay(s, addDays(monday, i));
    if (i < 5 || (st.cfg.show_weekend_lessons && d.lessons.length > 0)) out.push(d);
  }
  return out;
}

function headerBadges(st: RenderState): string {
  const s = st.schedule;
  if (!s) return "";
  const todayDay = getDay(s, st.today);
  const hasToday = s.days.has(st.today);
  const out: string[] = [];
  if (hasToday) {
    const n = countChanges([todayDay]).total;
    out.push(`<span class="hbadge ${n ? "warn" : "ok"}">${icon(n ? "warn" : "check", 16)}<span>${esc(changesLabel(n, st.t, "today"))}</span></span>`);
  }
  if (st.view === "week") {
    const n = countChanges(weekDays(st)).total;
    out.push(`<span class="hbadge neutral">${icon("calendar", 16)}<span>${esc(changesLabel(n, st.t, "week"))}</span></span>`);
  }
  return out.join("");
}

function subtitle(st: RenderState): string {
  if (!st.cfg.show_date) return "";
  const l = st.locale;
  if (st.view === "week") {
    const monday = mondayOf(st.date);
    return formatWeekRange(monday, addDays(monday, 4), l);
  }
  const d = fmtDate(st.date, l, { weekday: "long", day: "numeric", month: "long" });
  return d;
}

function header(st: RenderState): string {
  const title = st.cfg.title || `${st.t.title}${st.studentName ? " · " + st.studentName : ""}`;
  return `<header class="head">
    <div class="head-main">
      <span class="logo">${icon("cap", 30)}</span>
      <div class="titles"><h2>${esc(title)}</h2>${subtitle(st) ? `<div class="sub">${icon("calendar", 17)}<span>${esc(subtitle(st))}</span></div>` : ""}</div>
    </div>
    <div class="head-badges">${headerBadges(st)}</div>
    <div class="head-controls">${viewSwitch(st)}${navButtons(st)}</div>
  </header>`;
}

// ---------------------------------------------------------------------------
// Status / footer
// ---------------------------------------------------------------------------
function banners(st: RenderState): string {
  const t = st.t;
  const s = st.schedule;
  const out: string[] = [];
  if (st.cfg.show_status) {
    if (st.error === "service_error") out.push(banner("warn", t.err_service));
    if (st.error === "student_not_found") out.push(banner("warn", t.err_student));
    if (s?.quality === "limited") out.push(banner("info", `${t.limited}: ${t.limited_text}`));
    if (s?.status === "stale")
      out.push(
        banner("warn", fmt(t.status_stale, { t: relativeTime(s.fetchedAt, t, st.locale) || "–" })),
      );
    if (s?.status === "unavailable") out.push(banner("warn", t.status_unavailable));
  }
  return out.join("");
}

function banner(kind: "warn" | "info", text: string): string {
  return `<div class="banner ${kind}">${icon(kind === "warn" ? "warn" : "layers", 18)}<span>${esc(text)}</span></div>`;
}

function statusFooter(st: RenderState, left: string): string {
  if (!st.cfg.show_status && !left) return "";
  const s = st.schedule;
  let right = "";
  if (st.cfg.show_status && s) {
    const ok = s.status === "ok" && !st.error;
    right = `<span class="stand ${ok ? "ok" : "bad"}">${esc(st.t.status_updated)}: ${esc(relativeTime(s.fetchedAt, st.t, st.locale) || "–")} <span class="dot">${icon(ok ? "check" : "warn", 14)}</span></span>`;
  }
  return `<footer class="foot"><div class="foot-left">${left}</div>${right}</footer>`;
}

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------
function emptyDay(day: Day, st: RenderState, schedule: Schedule): string {
  const t = st.t;
  let title = t.no_school;
  let text = t.no_school_text;
  if (isWeekend(day.date)) {
    title = t.weekend;
    text = t.weekend_text;
  } else if (!day.loaded) {
    title = t.no_data;
    text = t.no_data_text;
  }
  let next = "";
  for (let i = 1; i <= 10; i++) {
    const d = schedule.days.get(addDays(day.date, i));
    if (d && d.lessons.length) {
      next = `<div class="empty-next">${esc(fmt(t.next_school_day, { day: weekdayName(d.date, st.locale) + ", " + fmtDate(d.date, st.locale, { day: "numeric", month: "long" }) }))}</div>`;
      break;
    }
  }
  return `<div class="empty">${icon(isWeekend(day.date) ? "calendar" : "building", 44)}<div class="empty-title">${esc(title)}</div><div class="empty-text">${esc(text)}</div>${next}</div>`;
}

function unmatchedExams(day: Day, st: RenderState): string {
  if (!day.unmatchedExams.length) return "";
  return day.unmatchedExams
    .map(
      (e) =>
        `<div class="lwrap"><div class="lesson row changed" style="--stripe:var(--c-exam)"><span class="num">${icon("doc", 16)}</span><span class="body"><span class="subj">${esc(e.subject || e.subjectAbbr)}</span><span class="chg c-exam"><span>${esc(e.type)}${e.comment ? " · " + esc(e.comment) : ""}</span></span><span class="m small">${esc(st.t.exam_without_lesson)}</span></span><span class="badges">${badge("exam", st.t)}</span></div></div>`,
    )
    .join("");
}

function dayList(day: Day, st: RenderState): string {
  const s = st.schedule!;
  const lessons = visibleLessons(day, st.cfg.show_cancelled);
  if (!lessons.length && !day.unmatchedExams.length) return emptyDay(day, st, s);
  return `<div class="list">${lessons.map((l) => lessonCard(l, st, "row")).join("")}${unmatchedExams(day, st)}</div>`;
}

function currentInfo(day: Day, st: RenderState): string {
  const t = st.t;
  if (day.date !== st.today) return "";
  const cur = currentLessons(day, st.nowMin).filter((l) => !l.cancelled);
  if (cur.length)
    return `<span class="foot-info">${icon("clock", 18)}<span>${esc(t.current_lesson)}: <b>${esc(cur.map((l) => `${l.period} · ${l.subjectFull || l.subject}`).join(", "))}</b></span></span>`;
  const nxt = nextLessons(day, st.nowMin);
  if (nxt.length)
    return `<span class="foot-info">${icon("clock", 18)}<span>${esc(t.next_lesson)}: <b>${esc(nxt.map((l) => `${l.period} · ${l.subjectFull || l.subject}`).join(", "))}</b> ${esc(t.at)} ${esc(nxt[0].start ?? "")}</span></span>`;
  return `<span class="foot-info">${icon("clock", 18)}<span>${esc(t.no_current)}</span></span>`;
}

function statTiles(day: Day, st: RenderState, withCurrent: boolean): string {
  const s = st.schedule!;
  const times = dayTimes(day, s);
  const tiles = [
    tile("play", st.t.start, times.start ?? "–", "t-start"),
    tile("flag", st.t.end, times.end ?? "–", "t-end"),
    tile("layers", st.t.lessons, String(times.count), "t-count"),
  ];
  if (withCurrent && day.date === st.today) {
    const cur = day.date === st.today ? currentLessons(day, st.nowMin).filter((l) => !l.cancelled) : [];
    const nxt = !cur.length && day.date === st.today ? nextLessons(day, st.nowMin) : [];
    const label = cur.length ? st.t.current_lesson : nxt.length ? st.t.next_lesson : st.t.current_lesson;
    const val = cur.length
      ? cur.map((l) => `${l.period}. ${l.subject || l.subjectFull}`).join(", ")
      : nxt.length
        ? `${nxt[0].period}. ${nxt[0].subject || nxt[0].subjectFull}`
        : "–";
    tiles.push(tile("clock", label, val, "t-current"));
  }
  return `<div class="tiles">${tiles.join("")}</div>`;
}

function dayView(st: RenderState): string {
  const s = st.schedule!;
  const day = getDay(s, st.date);
  const hasLessons = day.lessons.length > 0;
  const n = countChanges([day]).total;
  const tiles = hasLessons ? statTiles(day, st, false) : "";
  const foot = hasLessons ? currentInfo(day, st) || `<span class="foot-info">${icon("warn", 18)}<span>${esc(changesLabel(n, st.t, "day"))}</span></span>` : "";
  return `${tiles}${dayList(day, st)}${legend(st, false)}${statusFooter(st, foot)}`;
}

/** Day shown by the compact view: today, or the next school day once lessons are over / school is out. */
export function pickCompactDay(st: RenderState): Day {
  const s = st.schedule!;
  const today = getDay(s, st.today);
  const active = today.lessons.filter((l) => !l.cancelled && l.endMin !== null);
  const over = active.length > 0 && active.every((l) => (l.endMin as number) <= st.nowMin);
  if (today.lessons.length && !over) return today;
  for (let i = 1; i <= 14; i++) {
    const d = s.days.get(addDays(st.today, i));
    if (d && d.lessons.length) return d;
  }
  return today;
}

function compactView(st: RenderState): string {
  const s = st.schedule!;
  const day = pickCompactDay(st);
  const t = st.t;
  const label =
    day.date === st.today
      ? t.today
      : day.date === addDays(st.today, 1)
        ? t.tomorrow
        : weekdayName(day.date, st.locale);
  const changed = changedLessons(day);
  const unm = unmatchedExams(day, st);
  const n = countChanges([day]).total;
  const dayLabel = `<div class="section-title">${esc(label)} · ${esc(fmtDate(day.date, st.locale, { day: "numeric", month: "long" }))} <span class="hbadge ${n ? "warn" : "ok"} small">${icon(n ? "warn" : "check", 14)}<span>${esc(changesLabel(n, t, "day"))}</span></span></div>`;
  if (!day.lessons.length) return `${dayLabel}${emptyDay(day, st, s)}${statusFooter(st, "")}`;
  const list = changed.length || unm ? `<div class="list">${changed.map((l) => lessonCard(l, st, "row")).join("")}${unm}</div>` : `<div class="all-good">${icon("check", 22)}<span>${esc(t.no_changes)}</span></div>`;
  return `${dayLabel}${statTiles(day, st, true)}${list}${legend(st, false)}${statusFooter(st, currentInfo(day, st))}`;
}

function weekView(st: RenderState): string {
  const s = st.schedule!;
  const days = weekDays(st);
  const { rows, cell } = lessonsByPeriod(days, st.cfg.show_cancelled);
  const t = st.t;
  const heads = days
    .map((d, i) => {
      const n = countChanges([d]).total;
      const isToday = d.date === st.today;
      const label = isToday ? changesLabel(n, t, "today").replace(/^[^:]*:\s*/, "") : n === 0 ? "" : n === 1 ? t.change_1 : fmt(t.changes_n, { n });
      let chip = "";
      if (!d.lessons.length && !d.unmatchedExams.length) {
        chip = `<span class="dchip off">${esc(isWeekend(d.date) ? t.weekend : d.loaded ? t.no_school : t.no_data)}</span>`;
      } else if (n === 0) chip = `<span class="dchip ok">${icon("check", 14)}<span>${esc(t.no_changes)}</span></span>`;
      else chip = `<span class="dchip warn">${icon("warn", 14)}<span>${esc(isToday ? `${t.today}: ${label}` : label)}</span></span>`;
      return `<div class="dhead ${isToday ? "today" : ""}" style="--d:${i}" data-date="${d.date}"><div class="dname"><b>${esc(weekdayName(d.date, st.locale))}</b><span>${esc(fmtDate(d.date, st.locale, { day: "numeric", month: "long" }))}</span></div>${chip}</div>`;
    })
    .join("");
  const cells: string[] = [];
  rows.forEach((p, pi) => {
    days.forEach((d, di) => {
      const ls = cell(d.date, p);
      if (!ls.length) return;
      cells.push(
        `<div class="cell ${d.date === st.today ? "today" : ""}" style="--d:${di};--p:${pi}">${ls.map((l) => lessonCard(l, st, "grid")).join("")}</div>`,
      );
    });
  });
  const extra = days
    .map((d, di) => (d.unmatchedExams.length ? `<div class="cell ${d.date === st.today ? "today" : ""}" style="--d:${di};--p:${rows.length}">${unmatchedExams(d, st)}</div>` : ""))
    .join("");
  const hasAny = days.some((d) => d.lessons.length || d.unmatchedExams.length);
  const grid = hasAny
    ? `<div class="week" style="--cols:${days.length}">${heads}${cells.join("")}${extra}</div>`
    : `<div class="week" style="--cols:${days.length}">${heads}</div><div class="empty">${icon("calendar", 44)}<div class="empty-title">${esc(t.no_data)}</div><div class="empty-text">${esc(t.no_data_text)}</div></div>`;
  const c = countChanges(days);
  const hours = days.reduce((a, d) => a + dayTimes(d, s).count, 0);
  const sum = st.cfg.show_summary
    ? `<div class="summary"><div class="sum-title">${icon("building", 22)}<b>${esc(t.summary_week)}</b></div><div class="sum-items"><span class="sum-i">${icon("calendar", 16)}${hours} ${esc(t.hours)}</span><span class="sum-i">${icon("warn", 16)}${esc(changesLabel(c.total, t, "day"))}</span>${TYPES.filter((x) => c.byType[x] > 0)
        .map((x) => `<span class="sum-i c-${x}"><span class="dotc"></span>${c.byType[x]} ${esc(typeLabel(t, x))}</span>`)
        .join("")}</div></div>`
    : "";
  return `${legend(st, true)}${grid}${sum}${statusFooter(st, "")}`;
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------
export function renderCard(st: RenderState): string {
  const t = st.t;
  if (st.loading && !st.schedule)
    return `<div class="card"><div class="empty">${icon("refresh", 40)}<div class="empty-title">${esc(t.title)}…</div></div></div>`;
  if (st.error === "config")
    return `<div class="card">${errorBox(t.err_config, t, false)}</div>`;
  if (st.error === "no_entity")
    return `<div class="card">${errorBox(t.err_missing_entity, t, false)}</div>`;
  if (!st.schedule)
    return `<div class="card">${header({ ...st, schedule: null })}${errorBox(st.error === "student_not_found" ? t.err_student : t.err_service, t, true)}</div>`;
  const body = st.view === "week" ? weekView(st) : st.view === "day" ? dayView(st) : compactView(st);
  return `<div class="card v-${st.view}">${header(st)}${banners(st)}<div class="body-wrap">${body}</div></div>`;
}

function errorBox(text: string, t: Strings, retry: boolean): string {
  return `<div class="empty err">${icon("warn", 44)}<div class="empty-title">${esc(text)}</div>${retry ? `<button class="todaybtn" data-reload="1">${esc(t.reload)}</button>` : ""}</div>`;
}

export { weekdayOf, hhmmToMinutes };
