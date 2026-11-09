import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";
import { buildSchema } from "../src/editor";
import { normalizeConfig } from "../src/card";
import { buildHass } from "./fixtures/sample";

// Tuesday 2025-05-13, 10:30 Europe/Berlin (lesson 4 is running)
const NOW = new Date("2025-05-13T08:30:00Z");

async function mount(config: Record<string, unknown> = {}, hassOverrides: Record<string, unknown> = {}) {
  const el = document.createElement("smo-schedule-card") as any;
  document.body.append(el);
  el.setConfig({ type: "custom:smo-schedule-card", entity: "sensor.schule_nils_beispiel_stundenplan_heute", ...config });
  el.hass = buildHass(hassOverrides);
  await vi.advanceTimersByTimeAsync(50);
  return el as HTMLElement & { shadowRoot: ShadowRoot };
}

const q = (el: HTMLElement, sel: string) => el.shadowRoot!.querySelector(sel) as HTMLElement | null;
const qa = (el: HTMLElement, sel: string) => [...el.shadowRoot!.querySelectorAll(sel)] as HTMLElement[];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout", "setInterval", "clearInterval"] });
  vi.setSystemTime(NOW);
});
afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("week view", () => {
  it("renders Monday–Friday with all lessons and the legend", async () => {
    const el = await mount();
    expect(qa(el, ".dhead")).toHaveLength(5);
    expect(qa(el, ".lesson")).toHaveLength(31);
    expect(qa(el, ".lpill")).toHaveLength(5);
    expect(q(el, "h2")!.textContent).toContain("Nils Beispiel");
    expect(q(el, ".sub")!.textContent).toContain("KW 20");
  });

  it("shows every change type with its colour class and the planned/actual values", async () => {
    const el = await mount();
    const text = (s: string) => qa(el, s).map((e) => e.textContent!.replace(/\s+/g, " ").trim());
    expect(qa(el, ".lesson.cancelled")).toHaveLength(1);
    expect(q(el, ".lesson.cancelled .subj")!.textContent).toBe("Englisch");
    expect(text(".chg.c-room")).toEqual(["B08B12"]);
    expect(text(".chg.c-teacher").some((t) => t.includes("Weber") && t.includes("Schmitt"))).toBe(true);
    expect(text(".chg.c-subject")).toEqual(["statt: Kunst"]);
    expect(qa(el, ".badge.c-cancel")).toHaveLength(1);
    expect(qa(el, ".badge.c-room")).toHaveLength(1);
    expect(qa(el, ".badge.c-teacher")).toHaveLength(2);
    expect(qa(el, ".badge.c-subject")).toHaveLength(1);
    expect(qa(el, ".badge.c-exam")).toHaveLength(2);
    expect(q(el, ".chg.c-exam")!.textContent).toContain("Klassenarbeit");
  });

  it("shows multiple changes of one lesson at the same time", async () => {
    const el = await mount();
    const lesson = qa(el, ".lesson").find((l) => l.querySelector(".badge.c-subject"))!;
    expect(lesson.querySelectorAll(".badge")).toHaveLength(2); // subject + teacher
    expect(lesson.getAttribute("style")).toContain("linear-gradient");
  });

  it("keeps normal lessons neutral", async () => {
    const el = await mount();
    const first = qa(el, ".lesson")[0];
    expect(first.classList.contains("changed")).toBe(false);
    expect(first.querySelector(".badge")).toBeNull();
  });

  it("highlights today and the running lesson", async () => {
    const el = await mount();
    expect(qa(el, ".dhead.today")).toHaveLength(1);
    expect(q(el, ".dhead.today")!.textContent).toContain("Dienstag");
    const now = qa(el, ".lesson.now");
    expect(now).toHaveLength(1);
    expect(now[0].textContent).toContain("Chemie");
  });

  it("renders summary counts and header badges", async () => {
    const el = await mount();
    const summary = q(el, ".summary")!.textContent!.replace(/\s+/g, " ");
    expect(summary).toContain("29 Stunden");
    expect(summary).toContain("6 Änderungen");
    expect(summary).toContain("1 Entfall");
    expect(summary).toContain("1 Raumwechsel");
    expect(summary).toContain("2 Lehrerwechsel");
    expect(q(el, ".head-badges")!.textContent).toContain("Heute: 2 Änderungen");
    expect(q(el, ".head-badges")!.textContent).toContain("Diese Woche: 6 Änderungen");
  });

  it("navigates between weeks and shows weekend days without lessons as hidden", async () => {
    const el = await mount();
    q(el, '[data-nav="1"]')!.click();
    expect(q(el, ".sub")!.textContent).toContain("KW 21");
    // Monday of next week has lessons (incl. afternoon + parallel course); rest is empty in the fixture
    expect(qa(el, ".lesson")).toHaveLength(5);
    expect(q(el, ".lesson .num")).not.toBeNull();
    q(el, '[data-nav="today"]')!.click();
    expect(q(el, ".sub")!.textContent).toContain("KW 20");
  });

  it("shows the next week on a Saturday", async () => {
    vi.setSystemTime(new Date("2025-05-17T08:00:00Z"));
    const el = await mount();
    expect(q(el, ".sub")!.textContent).toContain("KW 21");
  });
});

describe("day view", () => {
  it("lists all lessons of the day with times, teachers and rooms", async () => {
    const el = await mount({ default_view: "day" });
    expect(qa(el, ".lesson")).toHaveLength(6);
    expect(q(el, ".tiles")!.textContent).toContain("07:45");
    expect(q(el, ".tiles")!.textContent).toContain("12:55");
    const first = qa(el, ".lesson")[0].textContent!;
    expect(first).toContain("07:45 – 08:30");
    expect(first).toContain("Weber");
    expect(first).toContain("B08");
    expect(q(el, ".foot-info")!.textContent).toContain("Aktuelle Stunde");
    expect(q(el, ".foot-info")!.textContent).toContain("Chemie");
  });

  it("navigates days and skips the weekend", async () => {
    const el = await mount({ default_view: "day" });
    for (let i = 0; i < 3; i++) q(el, '[data-nav="1"]')!.click(); // Wed, Thu, Fri
    expect(q(el, ".sub")!.textContent).toContain("Freitag");
    q(el, '[data-nav="1"]')!.click();
    expect(q(el, ".sub")!.textContent).toContain("Montag");
    expect(q(el, ".sub")!.textContent).toContain("19");
  });

  it("shows a weekend message with the next school day", async () => {
    vi.setSystemTime(new Date("2025-05-17T08:00:00Z"));
    const el = await mount({ default_view: "day" });
    expect(q(el, ".empty-title")!.textContent).toBe("Wochenende");
    expect(q(el, ".empty-next")!.textContent).toContain("Montag");
  });

  it("shows 'no data' for days outside the loaded range", async () => {
    vi.setSystemTime(new Date("2025-08-05T08:00:00Z"));
    const el = await mount({ default_view: "day" });
    expect(q(el, ".empty-title")!.textContent).toBe("Keine Daten");
  });

  it("expands lesson details by tapping", async () => {
    const el = await mount({ default_view: "day" });
    const roomLesson = qa(el, "button.lesson").find((b) => b.querySelector(".badge.c-room"))!;
    roomLesson.click();
    const detail = q(el, ".detail")!;
    expect(detail.textContent).toContain("Deutsch");
    expect(detail.textContent).toContain("Geplant");
    expect(detail.textContent).toContain("B08");
    q(el, "button.lesson[aria-expanded='true']")!.click();
    expect(q(el, ".detail")).toBeNull();
  });

  it("keeps cancelled lessons visible and can hide them on request", async () => {
    let el = await mount({ default_view: "day" });
    expect(qa(el, ".lesson.cancelled")).toHaveLength(1);
    document.body.innerHTML = "";
    el = await mount({ default_view: "day", show_cancelled: false });
    expect(qa(el, ".lesson.cancelled")).toHaveLength(0);
    expect(qa(el, ".lesson")).toHaveLength(5);
  });
});

describe("compact view", () => {
  it("shows start, end, current lesson and only the changes", async () => {
    const el = await mount({ default_view: "compact" });
    const tiles = q(el, ".tiles")!.textContent!;
    expect(tiles).toContain("07:45");
    expect(tiles).toContain("12:55");
    expect(tiles).toContain("4. Ch");
    expect(qa(el, ".lesson")).toHaveLength(2);
    expect(qa(el, ".lesson").map((l) => l.querySelector(".badge")!.className)).toEqual(["badge c-room", "badge c-cancel"]);
  });

  it("switches to the next school day after the last lesson", async () => {
    vi.setSystemTime(new Date("2025-05-13T12:00:00Z")); // 14:00 local
    const el = await mount({ default_view: "compact" });
    expect(q(el, ".section-title")!.textContent).toContain("Morgen");
    expect(qa(el, ".lesson")).toHaveLength(1);
    expect(q(el, ".t-current")).toBeNull(); // no "current lesson" for a future day
  });
});

describe("views, config and status", () => {
  it("switches views and respects the configured visible views", async () => {
    const el = await mount({ views: ["day", "week"], default_view: "week" });
    expect(qa(el, ".segbtn")).toHaveLength(2);
    q(el, '[data-view="day"]')!.click();
    expect(q(el, ".card")!.classList.contains("v-day")).toBe(true);
  });

  it("falls back to the first visible view when the default is hidden", () => {
    expect(normalizeConfig({ views: ["day"], default_view: "week" }).default_view).toBe("day");
    expect(normalizeConfig({ views: [] as any }).views).toEqual(["compact", "day", "week"]);
  });

  it("hides optional parts according to the display options", async () => {
    const el = await mount({ show_legend: false, show_summary: false, show_teacher: false, show_room: false, show_times: false });
    expect(q(el, ".legend")).toBeNull();
    expect(q(el, ".summary")).toBeNull();
    expect(q(el, ".meta")).toBeNull();
    expect(q(el, ".time")).toBeNull();
  });

  it("asks for a student when none is configured", async () => {
    const el = await mount({ entity: undefined });
    expect(q(el, ".empty-title")!.textContent).toContain("Schüler");
  });

  it("shows a warning for stale data", async () => {
    const hass = buildHass();
    const base = hass.connection.sendMessagePromise;
    hass.connection.sendMessagePromise = async (m: any) => {
      const r = await base(m);
      r.response.students.forEach((s: any) => (s.status = "stale"));
      return r;
    };
    const el = document.createElement("smo-schedule-card") as any;
    document.body.append(el);
    el.setConfig({ type: "custom:smo-schedule-card", entity: "sensor.schule_nils_beispiel_stundenplan_heute" });
    el.hass = hass;
    await vi.advanceTimersByTimeAsync(50);
    expect(el.shadowRoot.querySelector(".banner.warn")!.textContent).toContain("Letzter Abruf fehlgeschlagen");
    expect(el.shadowRoot.querySelector(".stand")!.textContent).toContain("Stand");
  });

  it("shows a load error with a reload button", async () => {
    const hass = buildHass();
    hass.connection.sendMessagePromise = async () => {
      throw new Error("offline");
    };
    const el = document.createElement("smo-schedule-card") as any;
    document.body.append(el);
    el.setConfig({ type: "custom:smo-schedule-card", entity: "sensor.schule_nils_beispiel_stundenplan_heute" });
    el.hass = hass;
    await vi.advanceTimersByTimeAsync(50);
    expect(el.shadowRoot.querySelector(".empty.err")!.textContent).toContain("nicht geladen");
    expect(el.shadowRoot.querySelector("[data-reload]")).not.toBeNull();
  });

  it("escapes HTML coming from the data", async () => {
    const hass = buildHass();
    const base = hass.connection.sendMessagePromise;
    hass.connection.sendMessagePromise = async (m: any) => {
      const r = await base(m);
      r.response.students[0].days[0].lessons[0].subject_full = '<img src=x onerror="alert(1)">';
      return r;
    };
    const el = document.createElement("smo-schedule-card") as any;
    document.body.append(el);
    el.setConfig({ type: "custom:smo-schedule-card", entity: "sensor.schule_nils_beispiel_stundenplan_heute" });
    el.hass = hass;
    await vi.advanceTimersByTimeAsync(50);
    expect(el.shadowRoot.querySelector("img")).toBeNull();
  });

  it("reloads when the integration announces an update", async () => {
    const hass = buildHass();
    let handler: () => void = () => undefined;
    hass.connection.subscribeEvents = async (cb: () => void, type: string) => {
      expect(type).toBe("schulmanager_schedule_updated");
      handler = cb;
      return () => undefined;
    };
    const el = document.createElement("smo-schedule-card") as any;
    document.body.append(el);
    el.setConfig({ type: "custom:smo-schedule-card", entity: "sensor.schule_nils_beispiel_stundenplan_heute" });
    el.hass = hass;
    await vi.advanceTimersByTimeAsync(50);
    const before = hass.calls.length;
    handler();
    await vi.advanceTimersByTimeAsync(500);
    expect(hass.calls.length).toBe(before + 1);
  });

  it("uses the light theme and English when configured", async () => {
    const el = await mount({ language: "en" }, { themes: { darkMode: false } });
    expect(el.getAttribute("data-theme")).toBe("light");
    expect(q(el, ".legend")!.textContent).toContain("Cancelled");
  });
});

describe("editor schema", () => {
  it("offers all students found in the entity registry as dropdown options", () => {
    const { schema, entityValue } = buildSchema(buildHass(), { entity: "sensor.schule_mia_beispiel_wochenplan_json" }, "de");
    const entity = schema[0] as any;
    expect(entity.selector.select.options).toEqual([
      { value: "sensor.schule_mia_beispiel_stundenplan_heute", label: "Mia Beispiel" },
      { value: "sensor.schule_nils_beispiel_stundenplan_heute", label: "Nils Beispiel" },
    ]);
    expect(entityValue).toBe("sensor.schule_mia_beispiel_stundenplan_heute");
  });

  it("covers student, default view, visible views and display options", () => {
    const { schema } = buildSchema(buildHass(), {}, "de");
    const names = JSON.stringify(schema);
    for (const key of ["entity", "default_view", "views", "show_legend", "show_summary", "show_teacher", "show_room", "expandable"]) {
      expect(names).toContain(`"${key}"`);
    }
  });
});
