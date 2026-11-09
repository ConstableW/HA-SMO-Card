// ---------------------------------------------------------------------------
// Raw shape of `schulmanager.get_schedule` (schema_version 1)
// ---------------------------------------------------------------------------
export interface RawOriginal {
  subject: string;
  subject_full: string;
  teachers: string[];
  rooms: string[];
  group: string | null;
}

export interface RawLesson {
  id: string;
  date: string;
  period: string;
  start: string | null;
  end: string | null;
  subject: string;
  subject_full: string;
  group: string | null;
  course_id: string | null;
  teachers: string[];
  rooms: string[];
  kind: string; // lesson | event | unknown
  status: string; // scheduled | changed | cancelled | unknown
  changes: string[]; // cancellation | subject | teacher | room | special
  notes: string[];
  original: RawOriginal | null;
  source_type?: string;
}

export interface RawPeriod {
  period: string;
  start: string | null;
  end: string | null;
}

export interface RawDay {
  date: string;
  loaded: boolean;
  lessons: RawLesson[];
}

export interface RawStudentSchedule {
  config_entry_id: string;
  student_id: string;
  name: string;
  school: string;
  status: "ok" | "stale" | "unavailable" | string;
  fetched_at: string | null;
  range: { start: string; end: string } | null;
  periods: RawPeriod[];
  days: RawDay[];
}

export interface RawScheduleResponse {
  schema_version: number;
  source: string;
  students: RawStudentSchedule[];
}

// ---------------------------------------------------------------------------
// Normalised view model used by the renderer
// ---------------------------------------------------------------------------
export type ChangeType = "cancel" | "room" | "teacher" | "subject" | "other" | "exam";

export interface Change {
  type: ChangeType;
  /** Planned value (e.g. old room). */
  from?: string;
  /** Value that applies instead (e.g. new room). */
  to?: string;
  /** Free text, e.g. exam type or note. */
  text?: string;
}

export interface Exam {
  date: string;
  subject: string;
  subjectAbbr: string;
  type: string;
  comment: string;
}

export interface Lesson {
  id: string;
  date: string;
  period: string;
  periodNum: number;
  start: string | null; // HH:MM
  end: string | null; // HH:MM
  startMin: number | null;
  endMin: number | null;
  subject: string;
  subjectFull: string;
  group: string | null;
  teachers: string[];
  rooms: string[];
  kind: "lesson" | "event" | "unknown";
  cancelled: boolean;
  changes: Change[];
  notes: string[];
  original: RawOriginal | null;
}

export interface Day {
  date: string;
  weekday: number; // 1 = Monday ... 7 = Sunday
  loaded: boolean; // data for this day exists
  lessons: Lesson[];
  exams: Exam[]; // all exams of that day
  unmatchedExams: Exam[]; // exams that could not be assigned to a lesson
}

export interface Period {
  period: string;
  periodNum: number;
  start: string | null;
  end: string | null;
}

export type DataQuality = "full" | "limited";
export type FetchStatus = "ok" | "stale" | "unavailable";

export interface Schedule {
  studentId: string;
  name: string;
  school: string;
  status: FetchStatus;
  fetchedAt: string | null;
  range: { start: string; end: string } | null;
  periods: Period[];
  days: Map<string, Day>;
  quality: DataQuality;
  /** Human readable reason for limited data. */
  qualityNote?: string;
}

// ---------------------------------------------------------------------------
// Card configuration
// ---------------------------------------------------------------------------
export type ViewMode = "compact" | "day" | "week";

export interface CardConfig {
  type: string;
  /** Any entity of the student's Schulmanager device (e.g. the "Stundenplan heute" sensor). */
  entity?: string;
  /** Alternative to `entity`: Schulmanager student id. */
  student_id?: string;
  title?: string;
  default_view?: ViewMode;
  views?: ViewMode[];
  show_teacher?: boolean;
  show_room?: boolean;
  show_times?: boolean;
  show_cancelled?: boolean;
  show_legend?: boolean;
  show_summary?: boolean;
  show_status?: boolean;
  show_date?: boolean;
  expandable?: boolean;
  /** Show whole week from Monday to Friday even when the weekend is selected. */
  weekend_shows_next_week?: boolean;
  /** Include Saturday and Sunday columns if they hold lessons. */
  show_weekend_lessons?: boolean;
  language?: "auto" | "de" | "en";
}

export const DEFAULT_CONFIG: Required<
  Omit<CardConfig, "type" | "entity" | "student_id" | "title">
> = {
  default_view: "week",
  views: ["compact", "day", "week"],
  show_teacher: true,
  show_room: true,
  show_times: true,
  show_cancelled: true,
  show_legend: true,
  show_summary: true,
  show_status: true,
  show_date: true,
  expandable: true,
  weekend_shows_next_week: true,
  show_weekend_lessons: true,
  language: "auto",
};
