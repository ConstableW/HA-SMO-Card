/** Synthetic timetable in the exact format of `schulmanager.get_schedule` (schema_version 1). */
import type { RawLesson, RawScheduleResponse, RawStudentSchedule } from "../../src/types";

const TIMES: Record<string, [string, string]> = {
  "1": ["07:45", "08:30"],
  "2": ["08:30", "09:15"],
  "3": ["09:35", "10:20"],
  "4": ["10:20", "11:05"],
  "5": ["11:20", "12:05"],
  "6": ["12:10", "12:55"],
  "7": ["13:45", "14:30"],
};

export const SUBJECTS: Record<string, string> = {
  M: "Mathematik",
  D: "Deutsch",
  E: "Englisch",
  B: "Biologie",
  Ch: "Chemie",
  Sp: "Sport",
  G: "Geschichte",
  Ph: "Physik",
  Geo: "Geographie",
  Mu: "Musik",
  Re: "Religion",
  Ku: "Kunst",
  Inf: "Informatik",
};

interface Spec {
  p: string;
  s: string;
  t?: string[];
  r?: string[];
  group?: string | null;
  status?: "scheduled" | "changed" | "cancelled";
  changes?: string[];
  notes?: string[];
  orig?: { s: string; t?: string[]; r?: string[] };
  kind?: string;
  source?: string;
}

export function lesson(date: string, spec: Spec): RawLesson {
  const [from, until] = TIMES[spec.p];
  const status = spec.status ?? "scheduled";
  const o = spec.orig;
  const cancelled = status === "cancelled";
  return {
    id: `${date}-${spec.p}-${spec.s}`,
    date,
    period: spec.p,
    start: `${date}T${from}:00+02:00`,
    end: `${date}T${until}:00+02:00`,
    subject: spec.s,
    subject_full: SUBJECTS[spec.s] ?? spec.s,
    group: spec.group ?? null,
    course_id: null,
    teachers: cancelled ? [] : (spec.t ?? []),
    rooms: cancelled ? [] : (spec.r ?? []),
    kind: spec.kind ?? "lesson",
    status,
    changes: spec.changes ?? (cancelled ? ["cancellation"] : []),
    notes: spec.notes ?? [],
    original:
      o || cancelled
        ? {
            subject: o?.s ?? spec.s,
            subject_full: SUBJECTS[o?.s ?? spec.s] ?? (o?.s ?? spec.s),
            teachers: o?.t ?? spec.t ?? [],
            rooms: o?.r ?? spec.r ?? [],
            group: spec.group ?? null,
          }
        : null,
    source_type: spec.source ?? (cancelled ? "cancelledLesson" : status === "changed" ? "changedLesson" : "regularLesson"),
  };
}

/** Week 2025-05-12 … 2025-05-16 (same content as the design mockup), plus the following week. */
export function buildStudent(id = "1001", name = "Nils Beispiel"): RawStudentSchedule {
  const d = (n: number) => `2025-05-${String(12 + n).padStart(2, "0")}`;
  const days = [
    {
      date: d(0),
      lessons: [
        lesson(d(0), { p: "1", s: "M", t: ["Weber"], r: ["B08"] }),
        lesson(d(0), { p: "2", s: "D", t: ["Müller"], r: ["B12"] }),
        lesson(d(0), { p: "3", s: "E", t: ["Smith"], r: ["B10"] }),
        lesson(d(0), { p: "4", s: "B", t: ["Keller"], r: ["N02"] }),
        lesson(d(0), { p: "5", s: "Sp", t: ["Lange"], r: ["TH1"] }),
        lesson(d(0), { p: "6", s: "G", t: ["Brandt"], r: ["B06"] }),
      ],
    },
    {
      date: d(1),
      lessons: [
        lesson(d(1), { p: "1", s: "M", t: ["Weber"], r: ["B08"] }),
        // room change
        lesson(d(1), { p: "2", s: "D", t: ["Müller"], r: ["B12"], status: "changed", changes: ["room"], orig: { s: "D", t: ["Müller"], r: ["B08"] } }),
        // cancelled
        lesson(d(1), { p: "3", s: "E", t: ["Smith"], r: ["B10"], status: "cancelled" }),
        lesson(d(1), { p: "4", s: "Ch", t: ["Keller"], r: ["C01"] }),
        lesson(d(1), { p: "5", s: "Sp", t: ["Lange"], r: ["TH1"] }),
        lesson(d(1), { p: "6", s: "G", t: ["Brandt"], r: ["B06"] }),
      ],
    },
    {
      date: d(2),
      lessons: [
        lesson(d(2), { p: "1", s: "D", t: ["Müller"], r: ["B12"] }),
        // substitution
        lesson(d(2), { p: "2", s: "M", t: ["Schmitt"], r: ["B08"], status: "changed", changes: ["teacher"], orig: { s: "M", t: ["Weber"], r: ["B08"] } }),
        lesson(d(2), { p: "3", s: "Ph", t: ["König"], r: ["N01"] }),
        lesson(d(2), { p: "4", s: "E", t: ["Smith"], r: ["B10"] }),
        lesson(d(2), { p: "5", s: "Geo", t: ["Brand"], r: ["B14"] }),
        lesson(d(2), { p: "6", s: "Mu", t: ["Reuter"], r: ["M01"] }),
      ],
    },
    {
      date: d(3),
      lessons: [
        lesson(d(3), { p: "1", s: "B", t: ["Keller"], r: ["N02"] }),
        // subject change
        lesson(d(3), { p: "2", s: "Inf", t: ["Meier"], r: ["EDV1"], status: "changed", changes: ["subject", "teacher"], orig: { s: "Ku", t: ["Krüger"], r: ["EDV1"] } }),
        lesson(d(3), { p: "3", s: "D", t: ["Müller"], r: ["B12"] }),
        lesson(d(3), { p: "4", s: "M", t: ["Schmitt"], r: ["B08"] }),
        lesson(d(3), { p: "5", s: "E", t: ["Smith"], r: ["B10"] }),
        lesson(d(3), { p: "6", s: "Re", t: ["Brandt"], r: ["B06"] }),
      ],
    },
    {
      date: d(4),
      lessons: [
        lesson(d(4), { p: "1", s: "M", t: ["Schmitt"], r: ["B08"] }),
        lesson(d(4), { p: "2", s: "G", t: ["Brandt"], r: ["B06"] }),
        lesson(d(4), { p: "3", s: "E", t: ["Smith"], r: ["B10"] }),
        lesson(d(4), { p: "4", s: "Ch", t: ["Keller"], r: ["C01"] }),
        lesson(d(4), { p: "5", s: "Sp", t: ["Lange"], r: ["TH1"] }),
        lesson(d(4), { p: "6", s: "Ku", t: ["Krüger"], r: ["K01"] }),
      ],
    },
    { date: d(5), lessons: [] },
    { date: d(6), lessons: [] },
    // next week (Monday has an afternoon lesson, a parallel course and a special lesson)
    {
      date: d(7),
      lessons: [
        lesson(d(7), { p: "1", s: "M", t: ["Weber"], r: ["B08"] }),
        lesson(d(7), { p: "2", s: "M", t: ["Weber"], r: ["B08"] }),
        lesson(d(7), { p: "3", s: "Re", t: ["Brandt"], r: ["B06"], group: "Rk" }),
        lesson(d(7), { p: "3", s: "Ku", t: ["Krüger"], r: ["K01"], group: "Eth" }),
        lesson(d(7), { p: "7", s: "Sp", t: ["Lange"], r: ["TH1"], status: "changed", changes: ["special"], notes: ["AG Schwimmen"], source: "specialLesson" }),
      ],
    },
  ].map((x) => ({ ...x, loaded: true }));
  return {
    config_entry_id: "entry1",
    student_id: id,
    name,
    school: "Beispielschule",
    status: "ok",
    fetched_at: "2025-05-13T06:48:00+02:00",
    range: { start: d(0), end: d(7) },
    periods: Object.entries(TIMES).map(([period, [start, end]]) => ({ period, start, end })),
    days,
  };
}

export function buildResponse(): RawScheduleResponse {
  return {
    schema_version: 1,
    source: "schulmanager",
    students: [buildStudent("1001", "Nils Beispiel"), buildStudent("1002", "Mia Beispiel")],
  };
}

export const EXAMS = [
  { date: "2025-05-16", days_from_now: 3, subject: "Englisch", subject_abbr: "E", type: "Klassenarbeit", comment: "2. AT" },
  { date: "2025-05-15", days_from_now: 2, subject: "Latein", subject_abbr: "L", type: "Test", comment: "" },
];

/** Minimal hass mock with entity registry, device registry, sensors and the service response. */
export function buildHass(overrides: Record<string, unknown> = {}) {
  const students = [
    { id: "1001", slug: "nils_beispiel", name: "Nils Beispiel", device: "dev1" },
    { id: "1002", slug: "mia_beispiel", name: "Mia Beispiel", device: "dev2" },
  ];
  const entities: Record<string, any> = {};
  const states: Record<string, any> = {};
  const devices: Record<string, any> = {};
  for (const s of students) {
    devices[s.device] = { id: s.device, name: s.name };
    const defs: [string, string, string][] = [
      ["stundenplan_heute", "schedule_today", "Planmäßig"],
      ["stundenplan_morgen", "schedule_tomorrow", "Planmäßig"],
      ["stundenplan_anderungen", "schedule_changes", "0"],
      ["wochenplan_json", "wochenplan_json", "KW 20"],
      ["tage_bis_nachste_arbeit", "next_exam_days", "2"],
    ];
    for (const [suffix, key, state] of defs) {
      const id = `sensor.schule_${s.slug}_${suffix}`;
      entities[id] = { entity_id: id, device_id: s.device, platform: "schulmanager", translation_key: key };
      states[id] = {
        entity_id: id,
        state,
        last_updated: "2025-05-13T04:48:00Z",
        attributes:
          key === "next_exam_days"
            ? { upcoming_exams: EXAMS }
            : key === "schedule_today"
              ? { raw: { student_id: s.id, lessons: [], day: "today" }, friendly_name: `${s.name} Stundenplan heute` }
              : {},
      };
    }
  }
  const calls: unknown[] = [];
  const hass = {
    states,
    entities,
    devices,
    language: "de",
    locale: { language: "de" },
    themes: { darkMode: true },
    config: { time_zone: "Europe/Berlin" },
    services: { schulmanager: { get_schedule: {} } },
    calls,
    connection: {
      sendMessagePromise: async (msg: any) => {
        calls.push(msg);
        return { response: buildResponse() };
      },
      subscribeEvents: async () => () => undefined,
    },
    ...overrides,
  };
  return hass as any;
}
