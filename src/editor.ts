import { findStudents, type Hass } from "./hass";
import { STRINGS, pickLang } from "./i18n";
import { type CardConfig, DEFAULT_CONFIG } from "./types";

export const EDITOR_TAG = "smo-schedule-card-editor";

export function buildSchema(hass: Hass | undefined, config: Partial<CardConfig>, lang: "de" | "en") {
  const e = STRINGS[lang].editor;
  const t = STRINGS[lang];
  const students = hass ? findStudents(hass) : [];
  const options = students.map((s) => ({ value: s.today ?? s.all[0], label: s.name || (s.today ?? s.all[0]) }));
  // Keep a configured entity selectable even if it is not the student's main sensor.
  if (config.entity && !students.some((s) => s.all.includes(config.entity!))) {
    options.push({ value: config.entity, label: config.entity });
  }
  const selected = config.entity ? students.find((s) => s.all.includes(config.entity!)) : undefined;
  const entityValue = selected ? (selected.today ?? selected.all[0]) : config.entity;

  const viewOptions = [
    { value: "compact", label: t.compact },
    { value: "day", label: t.day },
    { value: "week", label: t.week },
  ];
  const bool = (name: string) => ({ name, selector: { boolean: {} } });
  const schema = [
    {
      name: "entity",
      required: true,
      selector: { select: { mode: "dropdown", options } },
    },
    { name: "title", selector: { text: {} } },
    {
      name: "default_view",
      required: true,
      selector: { select: { mode: "dropdown", options: viewOptions } },
    },
    {
      name: "views",
      selector: { select: { multiple: true, mode: "list", options: viewOptions } },
    },
    {
      name: "language",
      required: true,
      selector: {
        select: {
          mode: "dropdown",
          options: [
            { value: "auto", label: e.auto },
            { value: "de", label: "Deutsch" },
            { value: "en", label: "English" },
          ],
        },
      },
    },
    {
      type: "expandable",
      name: "",
      title: e.display_options,
      expanded: true,
      schema: [
        {
          type: "grid",
          name: "",
          schema: [
            bool("show_teacher"),
            bool("show_room"),
            bool("show_times"),
            bool("show_cancelled"),
            bool("show_legend"),
            bool("show_summary"),
            bool("show_status"),
            bool("show_date"),
            bool("expandable"),
            bool("weekend_shows_next_week"),
            bool("show_weekend_lessons"),
          ],
        },
      ],
    },
  ];
  return { schema, entityValue };
}

export class SmoScheduleCardEditor extends HTMLElement {
  private _hass?: Hass;
  private _config: Partial<CardConfig> = {};
  private _form?: HTMLElement & { hass?: Hass; data?: unknown; schema?: unknown; computeLabel?: unknown };

  set hass(hass: Hass) {
    this._hass = hass;
    this._update();
  }

  setConfig(config: CardConfig): void {
    this._config = { ...config };
    this._update();
  }

  private _lang() {
    return pickLang(this._config.language, this._hass?.locale?.language ?? this._hass?.language);
  }

  private _ensureForm(): void {
    if (this._form) return;
    this._form = document.createElement("ha-form") as any;
    this._form!.addEventListener("value-changed", (ev: Event) => {
      ev.stopPropagation();
      const value = (ev as CustomEvent).detail.value as Partial<CardConfig>;
      const next: Partial<CardConfig> = { ...this._config, ...value };
      // Drop options that equal the default, keep YAML tidy.
      for (const [k, v] of Object.entries(DEFAULT_CONFIG)) {
        if (JSON.stringify((next as any)[k]) === JSON.stringify(v) && k !== "default_view") delete (next as any)[k];
      }
      if (next.title === "") delete next.title;
      if (Array.isArray(next.views) && next.views.length === 0) delete next.views;
      this._config = next;
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: next }, bubbles: true, composed: true }));
    });
    this.append(this._form!);
  }

  private _update(): void {
    if (!this.isConnected && !this._hass) return;
    this._ensureForm();
    const lang = this._lang();
    const e = STRINGS[lang].editor;
    const { schema, entityValue } = buildSchema(this._hass, this._config, lang);
    const form = this._form!;
    form.hass = this._hass;
    form.schema = schema;
    form.data = { ...DEFAULT_CONFIG, ...this._config, entity: entityValue };
    form.computeLabel = (s: { name: string }) => (e as Record<string, string>)[s.name] ?? s.name;
  }

  connectedCallback(): void {
    this._update();
  }
}
