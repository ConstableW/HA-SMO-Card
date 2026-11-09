import { addDays, hhmmToMinutes } from "./dates";
import { type Hass, type StudentEntities, DOMAIN, EVENT_SCHEDULE_UPDATED } from "./hass";
import { buildDay, applyExams, periodNumber, sortChanges } from "./model";
import { normalizeResponse } from "./model";
import type { Change, Day, Exam, Lesson, RawScheduleResponse, Schedule } from "./types";

// ---------------------------------------------------------------------------
// Exams (from the "Tage bis nächste Arbeit" sensor)
// ---------------------------------------------------------------------------
export function parseExams(hass: Hass, entityId: string | undefined): Exam[] {
  if (!entityId) return [];
  const list = hass.states[entityId]?.attributes?.upcoming_exams;
  if (!Array.isArray(list)) return [];
  return list
    .filter((e) => e && typeof e.date === "string")
    .map((e) => ({
      date: String(e.date).slice(0, 10),
      subject: String(e.subject ?? ""),
      subjectAbbr: String(e.subject_abbr ?? ""),
      type: String(e.type ?? "Prüfung"),
      comment: String(e.comment ?? ""),
    }));
}

// ---------------------------------------------------------------------------
// Fallback: older integrations without `get_schedule` only offer the sensors
// for today and tomorrow. Only structured attributes are used (never emoji/HTML).
// ---------------------------------------------------------------------------
interface RawSensorLesson {
  hour?: string;
  subject?: string;
  subject_full?: string;
  room?: string;
  teacher?: string;
  type?: string;
  date?: string;
  original?: { subject?: string; subject_full?: string; teacher?: string; room?: string };
}

export function lessonFromSensor(l: RawSensorLesson, date: string, index: number): Lesson {
  const type = l.type ?? "regularLesson";
  const o = l.original;
  const changes: Change[] = [];
  const cancelled = type === "cancelledLesson";
  if (cancelled) {
    changes.push({ type: "cancel" });
  } else {
    if (o?.subject && l.subject && o.subject !== l.subject)
      changes.push({ type: "subject", from: o.subject_full || o.subject, to: l.subject_full || l.subject });
    if (o?.teacher && l.teacher && o.teacher !== l.teacher)
      changes.push({ type: "teacher", from: o.teacher, to: l.teacher });
    if (o?.room && l.room && o.room !== l.room) changes.push({ type: "room", from: o.room, to: l.room });
    if (!changes.length && type !== "regularLesson" && type !== "exam") changes.push({ type: "other" });
  }
  const subject = cancelled ? (o?.subject ?? l.subject ?? "") : (l.subject ?? "");
  const teacher = cancelled ? (o?.teacher ?? l.teacher) : l.teacher;
  const room = cancelled ? (o?.room ?? l.room) : l.room;
  const period = String(l.hour ?? "").replace(/\.$/, "");
  return {
    id: `${date}-${period}-${index}`,
    date,
    period,
    periodNum: periodNumber(period),
    start: null,
    end: null,
    startMin: null,
    endMin: null,
    subject,
    subjectFull: (cancelled ? (o?.subject_full ?? l.subject_full) : l.subject_full) || subject,
    group: null,
    teachers: teacher ? [teacher] : [],
    rooms: room ? [room] : [],
    kind: type === "event" ? "event" : "lesson",
    cancelled,
    changes: sortChanges(changes),
    notes: [],
    original: o
      ? {
          subject: o.subject ?? "",
          subject_full: o.subject_full ?? o.subject ?? "",
          teachers: o.teacher ? [o.teacher] : [],
          rooms: o.room ? [o.room] : [],
          group: null,
        }
      : null,
  };
}

export function buildFallbackSchedule(hass: Hass, student: StudentEntities, exams: Exam[], note: string): Schedule | null {
  const days = new Map<string, Day>();
  let fetchedAt: string | null = null;
  let unavailable = true;
  for (const ent of [student.today, student.tomorrow]) {
    const st = ent ? hass.states[ent] : undefined;
    const raw = st?.attributes?.raw;
    if (!st || !raw) continue;
    if (st.state !== "unavailable" && st.state !== "unknown") unavailable = false;
    const date: string | undefined =
      (raw.lessons?.[0]?.date as string | undefined)?.slice(0, 10) ?? (raw.date as string | undefined)?.slice(0, 10);
    if (!date) continue;
    const lessons = (raw.lessons as RawSensorLesson[]).map((l, i) => lessonFromSensor(l, date, i));
    days.set(date, buildDay(date, lessons, true));
    fetchedAt = st.last_updated ?? fetchedAt;
  }
  if (!days.size) return null;
  applyExams(days, exams);
  const dates = [...days.keys()].sort();
  return {
    studentId: student.studentId ?? "",
    name: student.name,
    school: "",
    status: unavailable ? "unavailable" : "ok",
    fetchedAt,
    range: { start: dates[0], end: dates[dates.length - 1] },
    periods: [],
    days,
    quality: "limited",
    qualityNote: note,
  };
}

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------
export interface LoadResult {
  schedule: Schedule | null;
  error: string | null;
}

export async function fetchSchedules(hass: Hass): Promise<RawScheduleResponse> {
  const res = await hass.connection.sendMessagePromise<{ response: RawScheduleResponse }>({
    type: "call_service",
    domain: DOMAIN,
    service: "get_schedule",
    service_data: {},
    return_response: true,
  });
  return res.response;
}

export function hasScheduleService(hass: Hass): boolean {
  return !!(hass as any).services?.[DOMAIN]?.get_schedule;
}

/** Load the schedule of one student. Falls back to the sensors when the service is missing. */
export async function loadSchedule(
  hass: Hass,
  student: StudentEntities,
  fallbackNote: string,
): Promise<LoadResult> {
  const exams = parseExams(hass, student.exam);
  let error: string | null = null;
  try {
    const resp = await fetchSchedules(hass);
    const all = normalizeResponse(resp, student.studentId ? { [student.studentId]: exams } : {});
    let schedule: Schedule | undefined;
    if (student.studentId) schedule = all.get(student.studentId);
    if (!schedule && student.name) {
      const raw = resp.students.find((s) => s.name === student.name);
      if (raw) schedule = all.get(String(raw.student_id));
    }
    if (!schedule && all.size === 1 && !student.studentId) schedule = [...all.values()][0];
    if (schedule) {
      if (!student.studentId) applyExams(schedule.days, exams);
      return { schedule, error: null };
    }
    error = "student_not_found";
  } catch (e: any) {
    error = e?.code === "service_not_found" || /not found/i.test(e?.message ?? "") ? "service_missing" : "service_error";
  }
  const fb = buildFallbackSchedule(hass, student, exams, fallbackNote);
  return { schedule: fb, error };
}

/** Subscribe to schedule updates of the integration. Returns an unsubscribe function. */
export async function subscribeUpdates(hass: Hass, cb: () => void): Promise<() => void> {
  try {
    return await hass.connection.subscribeEvents(() => cb(), EVENT_SCHEDULE_UPDATED);
  } catch {
    return () => undefined;
  }
}

export { addDays, hhmmToMinutes };
