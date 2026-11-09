import { describe, expect, it } from "vitest";
import { buildFallbackSchedule, lessonFromSensor, loadSchedule, parseExams } from "../src/data";
import { findStudents, resolveStudent } from "../src/hass";
import { buildHass } from "./fixtures/sample";

describe("student discovery", () => {
  it("finds students from the entity registry without hard-coded entity ids", () => {
    const hass = buildHass();
    const students = findStudents(hass);
    expect(students.map((s) => s.name)).toEqual(["Mia Beispiel", "Nils Beispiel"]);
    const nils = students.find((s) => s.name === "Nils Beispiel")!;
    expect(nils.studentId).toBe("1001");
    expect(nils.today).toBe("sensor.schule_nils_beispiel_stundenplan_heute");
    expect(nils.exam).toBe("sensor.schule_nils_beispiel_tage_bis_nachste_arbeit");
    expect(nils.all).toHaveLength(5);
  });

  it("ignores entities of other integrations", () => {
    const hass = buildHass();
    hass.entities["sensor.other"] = { entity_id: "sensor.other", device_id: "dev1", platform: "other" };
    expect(findStudents(hass).find((s) => s.deviceId === "dev1")!.all).not.toContain("sensor.other");
  });

  it("resolves a student by any of its entities or by student id", () => {
    const hass = buildHass();
    expect(resolveStudent(hass, { entity: "sensor.schule_mia_beispiel_wochenplan_json" })?.name).toBe("Mia Beispiel");
    expect(resolveStudent(hass, { student_id: "1001" })?.name).toBe("Nils Beispiel");
    expect(resolveStudent(hass, { entity: "sensor.unknown" })).toBeUndefined();
  });
});

describe("loadSchedule", () => {
  it("calls schulmanager.get_schedule with return_response and picks the right student", async () => {
    const hass = buildHass();
    const student = resolveStudent(hass, { entity: "sensor.schule_mia_beispiel_stundenplan_heute" })!;
    const res = await loadSchedule(hass, student, "note");
    expect(hass.calls[0]).toMatchObject({ type: "call_service", domain: "schulmanager", service: "get_schedule", return_response: true });
    expect(res.error).toBeNull();
    expect(res.schedule?.name).toBe("Mia Beispiel");
    expect(res.schedule?.quality).toBe("full");
    // exams come from the structured sensor attribute
    expect(res.schedule?.days.get("2025-05-16")?.lessons.some((l) => l.changes.some((c) => c.type === "exam"))).toBe(true);
  });

  it("reports an unknown student instead of showing another child's data", async () => {
    const hass = buildHass();
    const res = await loadSchedule(hass, { deviceId: "x", name: "Nobody", studentId: "999", all: [] }, "note");
    expect(res.schedule).toBeNull();
    expect(res.error).toBe("student_not_found");
  });

  it("falls back to the sensors when the service is missing", async () => {
    const hass = buildHass();
    hass.connection.sendMessagePromise = async () => {
      throw { code: "service_not_found", message: "Action schulmanager.get_schedule not found" };
    };
    const id = "sensor.schule_nils_beispiel_stundenplan_heute";
    hass.states[id].attributes.raw = {
      student_id: "1001",
      day: "today",
      lessons: [
        { hour: "1", subject: "M", subject_full: "Mathematik", room: "B08", teacher: "Weber", type: "regularLesson", date: "2025-05-13" },
        { hour: "2", subject: "D", subject_full: "Deutsch", room: "B12", teacher: "Müller", type: "changedLesson", date: "2025-05-13", original: { subject: "D", teacher: "Müller", room: "B08" } },
        { hour: "3", subject: "E", subject_full: "Englisch", room: "", teacher: "", type: "cancelledLesson", date: "2025-05-13", original: { subject: "E", teacher: "Smith", room: "B10" } },
      ],
    };
    const student = resolveStudent(hass, { entity: id })!;
    const res = await loadSchedule(hass, student, "limited");
    expect(res.error).toBe("service_missing");
    const s = res.schedule!;
    expect(s.quality).toBe("limited");
    const day = s.days.get("2025-05-13")!;
    expect(day.lessons.map((l) => l.changes.map((c) => c.type))).toEqual([[], ["room"], ["cancel"]]);
    expect(day.lessons[1].changes[0]).toEqual({ type: "room", from: "B08", to: "B12" });
    expect(day.lessons[2].teachers).toEqual(["Smith"]);
    // only days with real sensor data exist – nothing is invented
    expect([...s.days.keys()]).toEqual(["2025-05-13"]);
  });

  it("returns nothing (no invented data) when neither service nor sensors have lessons", async () => {
    const hass = buildHass();
    hass.connection.sendMessagePromise = async () => {
      throw new Error("boom");
    };
    const student = resolveStudent(hass, { entity: "sensor.schule_nils_beispiel_stundenplan_heute" })!;
    const res = await loadSchedule(hass, student, "limited");
    expect(res.error).toBe("service_error");
    expect(res.schedule).toBeNull();
  });
});

describe("helpers", () => {
  it("parses upcoming exams", () => {
    const hass = buildHass();
    const exams = parseExams(hass, "sensor.schule_nils_beispiel_tage_bis_nachste_arbeit");
    expect(exams[0]).toEqual({ date: "2025-05-16", subject: "Englisch", subjectAbbr: "E", type: "Klassenarbeit", comment: "2. AT" });
    expect(parseExams(hass, undefined)).toEqual([]);
  });

  it("builds sensor lessons for subject changes", () => {
    const l = lessonFromSensor({ hour: "2.", subject: "Inf", subject_full: "Informatik", teacher: "Meier", room: "EDV1", type: "changedLesson", original: { subject: "Ku", subject_full: "Kunst", teacher: "Krüger", room: "EDV1" } }, "2025-05-15", 0);
    expect(l.period).toBe("2");
    expect(l.changes.map((c) => c.type)).toEqual(["subject", "teacher"]);
  });

  it("returns null when the sensors have no structured data", () => {
    const hass = buildHass();
    const s = findStudents(hass)[0];
    expect(buildFallbackSchedule(hass, s, [], "x")).toBeNull();
  });
});
