import { describe, expect, it } from "vitest";
import { addDays, isoWeek, mondayOf, nowIn, weekdayOf } from "../src/dates";
import {
  changedLessons,
  countChanges,
  currentLessons,
  dayTimes,
  getDay,
  lessonsByPeriod,
  nextLessons,
  normalizeLesson,
  normalizeStudent,
  visibleLessons,
} from "../src/model";
import { EXAMS, buildStudent, lesson } from "./fixtures/sample";

const exams = EXAMS.map((e) => ({
  date: e.date,
  subject: e.subject,
  subjectAbbr: e.subject_abbr,
  type: e.type,
  comment: e.comment,
}));

describe("dates", () => {
  it("computes weekdays, mondays and calendar weeks", () => {
    expect(weekdayOf("2025-05-12")).toBe(1);
    expect(weekdayOf("2025-05-18")).toBe(7);
    expect(mondayOf("2025-05-16")).toBe("2025-05-12");
    expect(mondayOf("2025-05-18")).toBe("2025-05-12");
    expect(addDays("2025-05-31", 1)).toBe("2025-06-01");
    expect(isoWeek("2025-05-12")).toEqual({ week: 20, year: 2025 });
    expect(isoWeek("2026-01-01")).toEqual({ week: 1, year: 2026 });
  });

  it("reads the current time in the HA time zone", () => {
    const now = new Date("2025-05-13T22:30:00Z");
    expect(nowIn("Europe/Berlin", now)).toEqual({ date: "2025-05-14", minutes: 30 });
    expect(nowIn("UTC", now)).toEqual({ date: "2025-05-13", minutes: 22 * 60 + 30 });
  });
});

describe("normalizeLesson – change types", () => {
  it("regular lessons have no changes", () => {
    const l = normalizeLesson(lesson("2025-05-12", { p: "1", s: "M", t: ["Weber"], r: ["B08"] }));
    expect(l.changes).toEqual([]);
    expect(l.cancelled).toBe(false);
    expect(l.start).toBe("07:45");
    expect(l.end).toBe("08:30");
    expect(l.startMin).toBe(465);
  });

  it("cancellation (red) keeps the planned lesson visible", () => {
    const l = normalizeLesson(lesson("2025-05-13", { p: "3", s: "E", t: ["Smith"], r: ["B10"], status: "cancelled" }));
    expect(l.cancelled).toBe(true);
    expect(l.changes.map((c) => c.type)).toEqual(["cancel"]);
    expect(l.subjectFull).toBe("Englisch");
    expect(l.teachers).toEqual(["Smith"]); // restored from the original
    expect(l.rooms).toEqual(["B10"]);
  });

  it("room change (orange) exposes planned and actual room", () => {
    const l = normalizeLesson(
      lesson("2025-05-13", { p: "2", s: "D", t: ["Müller"], r: ["B12"], status: "changed", changes: ["room"], orig: { s: "D", t: ["Müller"], r: ["B08"] } }),
    );
    expect(l.changes).toEqual([{ type: "room", from: "B08", to: "B12" }]);
  });

  it("teacher change (yellow) exposes both teachers", () => {
    const l = normalizeLesson(
      lesson("2025-05-14", { p: "2", s: "M", t: ["Schmitt"], r: ["B08"], status: "changed", changes: ["teacher"], orig: { s: "M", t: ["Weber"], r: ["B08"] } }),
    );
    expect(l.changes).toEqual([{ type: "teacher", from: "Weber", to: "Schmitt" }]);
  });

  it("subject change (violet) and several simultaneous changes", () => {
    const l = normalizeLesson(
      lesson("2025-05-15", {
        p: "2",
        s: "Inf",
        t: ["Meier"],
        r: ["EDV1"],
        status: "changed",
        changes: ["subject", "teacher", "room"],
        orig: { s: "Ku", t: ["Krüger"], r: ["K01"] },
      }),
    );
    expect(l.changes.map((c) => c.type)).toEqual(["subject", "teacher", "room"]);
    expect(l.changes[0]).toMatchObject({ from: "Kunst", to: "Informatik" });
    expect(l.changes[2]).toMatchObject({ from: "K01", to: "EDV1" });
  });

  it("special lesson and notes become a generic change", () => {
    const l = normalizeLesson(
      lesson("2025-05-19", { p: "7", s: "Sp", t: ["Lange"], r: ["TH1"], status: "changed", changes: ["special"], notes: ["AG Schwimmen"] }),
    );
    expect(l.changes).toEqual([{ type: "other", text: "AG Schwimmen" }]);
  });

  it("derives changes from the original if the integration did not flag them", () => {
    const raw = lesson("2025-05-13", { p: "2", s: "D", t: ["Müller"], r: ["B12"], status: "changed", changes: [], orig: { s: "D", t: ["Müller"], r: ["B08"] } });
    expect(normalizeLesson(raw).changes).toEqual([{ type: "room", from: "B08", to: "B12" }]);
  });

  it("events are kept and not treated as lessons", () => {
    const l = normalizeLesson(lesson("2025-05-13", { p: "4", s: "Wandertag", kind: "event" }));
    expect(l.kind).toBe("event");
  });
});

describe("student schedule", () => {
  const schedule = normalizeStudent(buildStudent(), exams);

  it("marks exams on the matching lesson (blue) and keeps others", () => {
    const fri = getDay(schedule, "2025-05-16");
    const eng = fri.lessons.find((l) => l.subject === "E")!;
    expect(eng.changes.map((c) => c.type)).toEqual(["exam"]);
    expect(eng.changes[0]).toMatchObject({ text: "Klassenarbeit", to: "2. AT" });
    expect(fri.unmatchedExams).toEqual([]);
  });

  it("keeps exams without a matching lesson visible instead of inventing a lesson", () => {
    const thu = getDay(schedule, "2025-05-15");
    expect(thu.unmatchedExams.map((e) => e.subject)).toEqual(["Latein"]);
    expect(thu.lessons.every((l) => !l.changes.some((c) => c.type === "exam"))).toBe(true);
  });

  it("counts changes per type for a week", () => {
    const days = ["2025-05-12", "2025-05-13", "2025-05-14", "2025-05-15", "2025-05-16"].map((d) => getDay(schedule, d));
    const c = countChanges(days);
    expect(c.byType).toEqual({ cancel: 1, room: 1, teacher: 2, subject: 1, other: 0, exam: 2 });
    // lessons with changes: Tue room, Tue cancel, Wed teacher, Thu subject, Fri exam + unmatched exam Thu
    expect(c.total).toBe(6);
  });

  it("hides cancelled lessons only when configured", () => {
    const tue = getDay(schedule, "2025-05-13");
    expect(visibleLessons(tue, true)).toHaveLength(6);
    expect(visibleLessons(tue, false)).toHaveLength(5);
    expect(changedLessons(tue).map((l) => l.period)).toEqual(["2", "3"]);
  });

  it("derives start, end and lesson count without cancelled lessons", () => {
    const tue = getDay(schedule, "2025-05-13");
    expect(dayTimes(tue, schedule)).toEqual({ start: "07:45", end: "12:55", count: 5 });
  });

  it("finds the current and next lessons", () => {
    const mon = getDay(schedule, "2025-05-12");
    expect(currentLessons(mon, 10 * 60 + 30).map((l) => l.period)).toEqual(["4"]);
    expect(currentLessons(mon, 9 * 60 + 20)).toEqual([]);
    expect(nextLessons(mon, 9 * 60 + 20).map((l) => l.period)).toEqual(["3"]);
    expect(nextLessons(mon, 13 * 60)).toEqual([]);
  });

  it("supports parallel courses and afternoon lessons in aligned rows", () => {
    const next = getDay(schedule, "2025-05-19");
    const { rows, cell } = lessonsByPeriod([next], true);
    expect(rows).toEqual(["1", "2", "3", "7"]);
    expect(cell("2025-05-19", "3").map((l) => l.group)).toEqual(["Eth", "Rk"]);
  });

  it("returns an empty, not-loaded day outside of the fetched range", () => {
    const d = getDay(schedule, "2026-01-05");
    expect(d.loaded).toBe(false);
    expect(d.lessons).toEqual([]);
    const sat = getDay(schedule, "2025-05-17");
    expect(sat.loaded).toBe(true);
    expect(sat.lessons).toEqual([]);
  });
});
