import { addDays, isWeekend, mondayOf, nowIn } from "./dates";
import { hasScheduleService, loadSchedule, subscribeUpdates } from "./data";
import { type Hass, type StudentEntities, findStudents, resolveStudent } from "./hass";
import { STRINGS, pickLang } from "./i18n";
import { type RenderState, renderCard } from "./render";
import { STYLES } from "./styles";
import { type CardConfig, DEFAULT_CONFIG, type Schedule, type ViewMode } from "./types";

export const CARD_VERSION = "0.1.0";
export const CARD_TAG = "smo-schedule-card";
const ALL_VIEWS: ViewMode[] = ["compact", "day", "week"];

type FullConfig = RenderState["cfg"];

export function normalizeConfig(config: Partial<CardConfig>): FullConfig {
  const merged = { ...DEFAULT_CONFIG, ...config } as FullConfig & CardConfig;
  let views = Array.isArray(config.views) ? config.views.filter((v) => ALL_VIEWS.includes(v)) : [...DEFAULT_CONFIG.views];
  if (!views.length) views = [...DEFAULT_CONFIG.views];
  merged.views = ALL_VIEWS.filter((v) => views.includes(v));
  if (!merged.views.includes(merged.default_view)) merged.default_view = merged.views[0];
  return merged;
}

export class SmoScheduleCard extends HTMLElement {
  private _hass?: Hass;
  private _config!: FullConfig & Pick<CardConfig, "entity" | "student_id">;
  private _student?: StudentEntities;
  private _schedule: Schedule | null = null;
  private _error: string | null = null;
  private _loading = true;
  private _view: ViewMode = "week";
  private _date = "";
  private _expanded = new Set<string>();
  private _sig = "";
  private _timer?: number;
  private _loadTimer?: number;
  private _unsub?: () => void;
  private _loadSeq = 0;
  private _connected = false;
  private _root: HTMLElement;
  private _interacted = false;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = STYLES;
    this._root = document.createElement("div");
    this._root.className = "root";
    shadow.append(style, this._root);
    shadow.addEventListener("click", (e) => this._onClick(e));
  }

  // ---- Lovelace API ---------------------------------------------------
  static getConfigElement(): HTMLElement {
    return document.createElement(`${CARD_TAG}-editor`);
  }

  static getStubConfig(hass?: Hass): Partial<CardConfig> {
    const first = hass ? findStudents(hass)[0] : undefined;
    return { type: `custom:${CARD_TAG}`, ...(first ? { entity: first.today ?? first.all[0] } : {}), default_view: "week" };
  }

  setConfig(config: CardConfig): void {
    if (!config || typeof config !== "object") throw new Error("Invalid configuration");
    this._config = { ...normalizeConfig(config), entity: config.entity, student_id: config.student_id };
    this._view = this._config.default_view;
    this._date = "";
    this._interacted = false;
    this._sig = "";
    this._schedule = null;
    this._error = null;
    this._loading = true;
    this._ensureDate();
    this._render();
    if (this._hass) this._scheduleLoad(0);
  }

  set hass(hass: Hass) {
    const first = !this._hass;
    this._hass = hass;
    const theme = hass.themes?.darkMode;
    if (theme === undefined) this.removeAttribute("data-theme");
    else this.setAttribute("data-theme", theme ? "dark" : "light");
    if (!this._config) return;
    const sig = this._signature(hass);
    if (first || sig !== this._sig) {
      this._sig = sig;
      this._scheduleLoad(first ? 0 : 400);
    }
  }

  getCardSize(): number {
    return this._view === "week" ? 10 : this._view === "day" ? 8 : 5;
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6, rows: "auto" };
  }

  // ---- lifecycle ------------------------------------------------------
  connectedCallback(): void {
    this._connected = true;
    this._timer = window.setInterval(() => this._tick(), 30_000);
    this._subscribe();
    if (this._config) this._render();
  }

  disconnectedCallback(): void {
    this._connected = false;
    window.clearInterval(this._timer);
    window.clearTimeout(this._loadTimer);
    this._unsub?.();
    this._unsub = undefined;
  }

  // ---- internals ------------------------------------------------------
  private _signature(hass: Hass): string {
    const student = resolveStudent(hass, this._config);
    if (!student) return "none";
    const ids = [student.today, student.tomorrow, student.exam, student.changes].filter(Boolean) as string[];
    return ids.map((id) => `${id}:${hass.states[id]?.last_updated ?? ""}`).join("|") + `|svc:${hasScheduleService(hass)}`;
  }

  private _subscribe(): void {
    if (!this._hass || this._unsub || !this._connected) return;
    void subscribeUpdates(this._hass, () => this._scheduleLoad(300)).then((u) => {
      if (this._connected && !this._unsub) this._unsub = u;
      else u();
    });
  }

  private _scheduleLoad(delay: number): void {
    window.clearTimeout(this._loadTimer);
    this._loadTimer = window.setTimeout(() => void this._load(), delay);
  }

  private _lang() {
    return pickLang(this._config?.language, this._hass?.locale?.language ?? this._hass?.language);
  }

  private async _load(): Promise<void> {
    const hass = this._hass;
    if (!hass || !this._config) return;
    this._subscribe();
    const seq = ++this._loadSeq;
    if (!this._config.entity && !this._config.student_id) {
      this._error = "config";
      this._loading = false;
      this._render();
      return;
    }
    const student = resolveStudent(hass, this._config);
    if (!student) {
      this._error = "no_entity";
      this._loading = false;
      this._render();
      return;
    }
    this._student = student;
    const t = STRINGS[this._lang()];
    const res = await loadSchedule(hass, student, t.limited_text);
    if (seq !== this._loadSeq) return;
    this._schedule = res.schedule;
    this._error = res.error === "service_missing" && res.schedule ? null : res.error;
    this._loading = false;
    this._ensureDate();
    this._render();
  }

  private _today(): { date: string; minutes: number } {
    return nowIn(this._hass?.config?.time_zone);
  }

  /** Pick a sensible start date once. */
  private _ensureDate(): void {
    if (this._date && this._interacted) return;
    const { date } = this._today();
    let d = date;
    if (this._view === "week" && isWeekend(d) && this._config.weekend_shows_next_week) d = mondayOf(addDays(d, 7));
    this._date = d;
  }

  private _tick(): void {
    // Rolls over "today" and the current-lesson highlight without any data reload.
    if (!this._interacted) this._ensureDate();
    this._render();
  }

  private _stepDay(dir: 1 | -1): string {
    let d = this._date;
    for (let i = 0; i < 8; i++) {
      d = addDays(d, dir);
      const day = this._schedule?.days.get(d);
      if (!isWeekend(d) || (day && day.lessons.length)) return d;
    }
    return addDays(this._date, dir);
  }

  private _onClick(e: Event): void {
    const target = e.target as HTMLElement;
    const btn = target.closest<HTMLElement>("[data-view],[data-nav],[data-lesson],[data-reload],.dhead[data-date]");
    if (!btn) return;
    if (btn.dataset.view) {
      this._view = btn.dataset.view as ViewMode;
      this._interacted = this._interacted || false;
      if (this._view === "week" && isWeekend(this._date) && this._config.weekend_shows_next_week && !this._interacted)
        this._date = mondayOf(addDays(this._date, 7));
      this._render();
    } else if (btn.dataset.nav) {
      this._interacted = true;
      const nav = btn.dataset.nav;
      if (nav === "today") {
        this._interacted = false;
        this._date = "";
        this._ensureDate();
      } else if (this._view === "week") this._date = addDays(mondayOf(this._date), Number(nav) * 7);
      else this._date = this._stepDay(Number(nav) > 0 ? 1 : -1);
      this._render();
    } else if (btn.dataset.lesson) {
      const id = btn.dataset.lesson;
      if (this._expanded.has(id)) this._expanded.delete(id);
      else this._expanded.add(id);
      this._render();
    } else if (btn.dataset.reload) {
      this._loading = true;
      this._render();
      this._scheduleLoad(0);
    } else if (btn.classList.contains("dhead") && btn.dataset.date && this._config.views.includes("day")) {
      this._interacted = true;
      this._date = btn.dataset.date;
      this._view = "day";
      this._render();
    }
  }

  private _state(): RenderState {
    const lang = this._lang();
    const now = this._today();
    return {
      cfg: this._config,
      t: STRINGS[lang],
      locale: lang === "de" ? "de-DE" : (this._hass?.locale?.language ?? "en-GB"),
      schedule: this._schedule,
      studentName: this._schedule?.name || this._student?.name || "",
      error: this._error,
      loading: this._loading,
      view: this._view,
      date: this._date || now.date,
      today: now.date,
      nowMin: now.minutes,
      expanded: this._expanded,
      hasMultipleViews: this._config.views.length > 1,
    };
  }

  private _render(): void {
    if (!this._config) return;
    const scroll = this._root.scrollTop;
    this._root.innerHTML = renderCard(this._state());
    this._root.scrollTop = scroll;
  }
}
