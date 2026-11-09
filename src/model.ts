import { hhmmToMinutes, isoToHHMM, weekdayOf } from "./dates";
import type {
  Change,
  ChangeType,
  Day,
  Exam,
  FetchStatus,
  Lesson,
  Period,
  RawLesson,
  RawScheduleResponse,
  RawStudentSchedule,
  Schedule,
} from "./types";

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

export function periodNumber(p: string): number {
  const n = parseInt(p, 10);
  return Number.isFinite(n) ? n : 1000;
}

const join = (a: string[] | undefined) => (a ?? []).join(", ");
const same = (a: string[] | undefined, b: string[] | undefined) => join(a) === join(b);

/** Display priority of change types (first = dominant colour). */
export const CHANGE_ORDER: ChangeType[] = ["cancel", "subject", "teacher", "room", "other", "exam"];

export function sortChanges(changes: Change[]): Change[] {
  return [...changes].sort((a, b) => CHANGE_ORDER.indexOf(a.type) - CHANGE_ORDER.indexOf(b.type));
}

/** Convert one structured lesson of the integration into the view model. */
export function normalizeLesson(raw: RawLesson): Lesson {
  const cancelled = raw.status === "cancelled" || !!raw.changes?.includes("cancellation");
  const original = raw.original ?? null;
  const changes: Change[] = [];
  const kind = raw.kind === "lesson" || raw.kind === "event" ? raw.kind : "unknown";

  if (cancelled) {
    changes.push({ type: "cancel" });
  } else {
    const flags = new Set(raw.changes ?? []);
    if (flags.has("subject") && original) {
      changes.push({
        type: "subject",
        from: original.subject_full || original.subject,
        to: raw.subject_full || raw.subject,
      });
    }
    if (flags.has("teacher") && original) {
      changes.push({ type: "teacher", from: join(original.teachers), to: join(raw.teachers) });
    }
    if (flags.has("room") && original) {
      changes.push({ type: "room", from: join(original.rooms), to: join(raw.rooms) });
    }
    if (flags.has("special")) {
      changes.push({ type: "other", text: raw.notes?.[0] });
    }
    // Defensive: derive from the original if the integration did not flag it.
    if (original && !flags.size && raw.status === "changed") {
      if (original.subject !== raw.subject)
        changes.push({
          type: "subject",
          from: original.subject_full || original.subject,
          to: raw.subject_full || raw.subject,
        });
      if (!same(original.teachers, raw.teachers))
        changes.push({ type: "teacher", from: join(original.teachers), to: join(raw.teachers) });
      if (!same(original.rooms, raw.rooms))
        changes.push({ type: "room", from: join(original.rooms), to: join(raw.rooms) });
    }
    if (!changes.length && raw.status === "changed") {
      changes.push({ type: "other", text: raw.notes?.[0] });
    }
  }

  // For cancelled lessons the integration clears teachers/rooms; show what was planned.
  const teachers = cancelled && original ? original.teachers : (raw.teachers ?? []);
  const rooms = cancelled && original ? original.rooms : (raw.rooms ?? []);

  const start = isoToHHMM(raw.start);
  const end = isoToHHMM(raw.end);
  return {
    id: raw.id,
    date: raw.date,
    period: raw.period,
    periodNum: periodNumber(raw.period),
    start,
    end,
    startMin: hhmmToMinutes(start),
    endMin: hhmmToMinutes(end),
    subject: raw.subject,
    subjectFull: raw.subject_full || raw.subject,
    group: raw.group,
    teachers,
    rooms,
    kind,
    cancelled,
    changes: sortChanges(changes),
    notes: raw.notes ?? [],
    original,
  };
}

export function examMatchesLesson(exam: Exam, lesson: Lesson): boolean {
  if (exam.date !== lesson.date || lesson.kind === "event") return false;
  const subj = [lesson.subject, lesson.subjectFull, lesson.original?.subject, lesson.original?.subject_full].map(norm);
  return (
    (!!exam.subjectAbbr && subj.includes(norm(exam.subjectAbbr))) || (!!exam.subject && subj.includes(norm(exam.subject)))
  );
}

/** Attach exam markers to lessons and keep exams without a lesson visible. */
export function applyExams(days: Map<string, Day>, exams: Exam[]): void {
  for (const day of days.values()) {
    day.exams = exams.filter((e) => e.date === day.date);
    day.unmatchedExams = [];
    for (const exam of day.exams) {
      let matched = false;
      for (const lesson of day.lessons) {
        if (examMatchesLesson(exam, lesson)) {
          matched = true;
          lesson.changes = sortChanges([
            ...lesson.changes,
            { type: "exam", text: exam.type, to: exam.comment || undefined },
          ]);
        }
      }
      if (!matched) day.unmatchedExams.push(exam);
    }
  }
}

function fetchStatus(s: string): FetchStatus {
  return s === "ok" || s === "stale" ? s : "unavailable";
}

export function buildDay(date: string, lessons: Lesson[], loaded: boolean): Day {
  const sorted = [...lessons].sort(
    (a, b) => a.periodNum - b.periodNum || (a.startMin ?? 0) - (b.startMin ?? 0) || a.subject.localeCompare(b.subject),
  );
  return { date, weekday: weekdayOf(date), loaded, lessons: sorted, exams: [], unmatchedExams: [] };
}

export function normalizeStudent(raw: RawStudentSchedule, exams: Exam[] = []): Schedule {
  const days = new Map<string, Day>();
  for (const d of raw.days ?? []) {
    days.set(d.date, buildDay(d.date, (d.lessons ?? []).map(normalizeLesson), d.loaded !== false));
  }
  applyExams(days, exams);
  const periods: Period[] = (raw.periods ?? []).map((p) => ({
    period: p.period,
    periodNum: periodNumber(p.period),
    start: p.start,
    end: p.end,
  }));
  return {
    studentId: String(raw.student_id),
    name: raw.name,
    school: raw.school,
    status: fetchStatus(raw.status),
    fetchedAt: raw.fetched_at,
    range: raw.range,
    periods,
    days,
    quality: "full",
  };
}

export function normalizeResponse(resp: RawScheduleResponse, exams: Record<string, Exam[]> = {}): Map<string, Schedule> {
  const out = new Map<string, Schedule>();
  for (const s of resp?.students ?? []) {
    out.set(String(s.student_id), normalizeStudent(s, exams[String(s.student_id)] ?? []));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Queries on a normalised schedule
// ---------------------------------------------------------------------------
export function getDay(schedule: Schedule, date: string): Day {
  return (
    schedule.days.get(date) ?? {
      date,
      weekday: weekdayOf(date),
      loaded: false,
      lessons: [],
      exams: [],
      unmatchedExams: [],
    }
  );
}

export function visibleLessons(day: Day, showCancelled: boolean): Lesson[] {
  return showCancelled ? day.lessons : day.lessons.filter((l) => !l.cancelled);
}

export function changedLessons(day: Day): Lesson[] {
  return day.lessons.filter((l) => l.changes.length > 0);
}

/** Number of lessons/exams affected plus a tally per change type. */
export function countChanges(days: Day[]): { total: number; byType: Record<ChangeType, number> } {
  const byType: Record<ChangeType, number> = { cancel: 0, room: 0, teacher: 0, subject: 0, other: 0, exam: 0 };
  let total = 0;
  for (const day of days) {
    for (const l of day.lessons) {
      if (l.changes.length) total++;
      for (const c of l.changes) byType[c.type]++;
    }
    byType.exam += day.unmatchedExams.length;
    total += day.unmatchedExams.length;
  }
  return { total, byType };
}

export function dayTimes(day: Day, schedule: Schedule): { start: string | null; end: string | null; count: number } {
  const active = day.lessons.filter((l) => !l.cancelled && l.kind !== "event");
  const periodFor = (l: Lesson) => schedule.periods.find((p) => p.period === l.period);
  const starts = active.map((l) => l.start ?? periodFor(l)?.start ?? null).filter(Boolean) as string[];
  const ends = active.map((l) => l.end ?? periodFor(l)?.end ?? null).filter(Boolean) as string[];
  starts.sort();
  ends.sort();
  const periods = new Set(active.map((l) => l.period));
  return { start: starts[0] ?? null, end: ends[ends.length - 1] ?? null, count: periods.size };
}

/** Lessons running at the given minute (parallel courses give several). */
export function currentLessons(day: Day, minutes: number): Lesson[] {
  return day.lessons.filter((l) => l.startMin !== null && l.endMin !== null && minutes >= l.startMin && minutes < l.endMin);
}

/** Lessons of the next start time after `minutes`, if any. */
export function nextLessons(day: Day, minutes: number): Lesson[] {
  const upcoming = day.lessons.filter((l) => l.startMin !== null && l.startMin > minutes && !l.cancelled);
  if (!upcoming.length) return [];
  const first = Math.min(...upcoming.map((l) => l.startMin as number));
  return upcoming.filter((l) => l.startMin === first);
}

/** Group lessons by period for aligned grids (parallel courses stay in one cell). */
export function lessonsByPeriod(
  days: Day[],
  showCancelled: boolean,
): { rows: string[]; cell: (date: string, period: string) => Lesson[] } {
  const set = new Map<string, number>();
  for (const d of days) for (const l of visibleLessons(d, showCancelled)) set.set(l.period, l.periodNum);
  const rows = [...set.entries()].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0])).map(([p]) => p);
  return {
    rows,
    cell: (date, period) => {
      const d = days.find((x) => x.date === date);
      return d ? visibleLessons(d, showCancelled).filter((l) => l.period === period) : [];
    },
  };
}
