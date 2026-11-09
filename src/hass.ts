/** Minimal subset of the Home Assistant frontend objects the card relies on. */
export interface HassEntityState {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_updated?: string;
}

export interface HassEntityRegistryDisplay {
  entity_id: string;
  device_id?: string;
  platform?: string;
  translation_key?: string;
  name?: string;
}

export interface Hass {
  states: Record<string, HassEntityState>;
  entities?: Record<string, HassEntityRegistryDisplay>;
  devices?: Record<string, { id: string; name?: string; name_by_user?: string }>;
  language?: string;
  locale?: { language?: string };
  themes?: { darkMode?: boolean };
  config?: { time_zone?: string };
  connection: {
    sendMessagePromise<T = any>(msg: Record<string, unknown>): Promise<T>;
    subscribeEvents<T = any>(cb: (ev: T) => void, eventType: string): Promise<() => void>;
  };
  callWS?<T = any>(msg: Record<string, unknown>): Promise<T>;
}

export const DOMAIN = "schulmanager";
export const EVENT_SCHEDULE_UPDATED = "schulmanager_schedule_updated";

/** Identifies the entities that belong to a student without hard-coding entity ids. */
export interface StudentEntities {
  deviceId: string;
  name: string;
  studentId?: string;
  today?: string;
  tomorrow?: string;
  changes?: string;
  week?: string;
  exam?: string;
  /** All Schulmanager entity ids of the device. */
  all: string[];
}

const KEY_TO_FIELD: Record<string, keyof StudentEntities> = {
  schedule_today: "today",
  schedule_tomorrow: "tomorrow",
  schedule_changes: "changes",
  wochenplan_json: "week",
  next_exam_days: "exam",
};

/** List all students that have Schulmanager schedule entities. */
export function findStudents(hass: Hass): StudentEntities[] {
  const byDevice = new Map<string, StudentEntities>();
  for (const [entityId, reg] of Object.entries(hass.entities ?? {})) {
    if (reg.platform !== DOMAIN || !reg.device_id) continue;
    let s = byDevice.get(reg.device_id);
    if (!s) {
      const dev = hass.devices?.[reg.device_id];
      s = { deviceId: reg.device_id, name: dev?.name_by_user || dev?.name || "", all: [] };
      byDevice.set(reg.device_id, s);
    }
    s.all.push(entityId);
    const field = reg.translation_key ? KEY_TO_FIELD[reg.translation_key] : undefined;
    if (field) (s as any)[field] = entityId;
  }
  const students = [...byDevice.values()].filter((s) => s.today || s.tomorrow || s.week);
  for (const s of students) {
    const attrs: Record<string, any> | undefined = s.today ? hass.states[s.today]?.attributes : undefined;
    const sid = attrs?.raw?.student_id ?? (s.tomorrow && hass.states[s.tomorrow]?.attributes?.raw?.student_id);
    if (sid != null) s.studentId = String(sid);
    if (!s.name) {
      const fn: string | undefined = attrs?.friendly_name;
      s.name = fn ? fn.replace(/\s+Stundenplan.*$/i, "") : (s.today ?? "");
    }
  }
  return students.sort((a, b) => a.name.localeCompare(b.name));
}

/** Resolve the configured student (via any of its entities, or a student id). */
export function resolveStudent(hass: Hass, cfg: { entity?: string; student_id?: string }): StudentEntities | undefined {
  const students = findStudents(hass);
  if (cfg.entity) {
    const reg = hass.entities?.[cfg.entity];
    const byEntity = students.find((s) => s.all.includes(cfg.entity!));
    if (byEntity) return byEntity;
    if (reg?.device_id) {
      const byDev = students.find((s) => s.deviceId === reg.device_id);
      if (byDev) return byDev;
    }
  }
  if (cfg.student_id) {
    const sid = String(cfg.student_id);
    const found = students.find((s) => s.studentId === sid);
    if (found) return found;
    return { deviceId: "", name: "", studentId: sid, all: [] };
  }
  return undefined;
}
