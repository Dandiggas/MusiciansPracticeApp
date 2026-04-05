"use client";

export type StoredMediaSource = "youtube" | "audio";
export type StoredSessionStatus = "idle" | "active" | "paused";

export interface StoredPracticeSetup {
  instrument: string;
  description: string;
  mediaSource: StoredMediaSource;
  youtubeUrl: string;
  audioFileName: string | null;
  audioRequiresReupload: boolean;
  updatedAt: string;
}

export interface StoredSessionSnapshot {
  status: StoredSessionStatus;
  sessionId: number | null;
  instrument: string;
  description: string;
  mediaSource: StoredMediaSource;
  youtubeUrl: string;
  audioFileName: string | null;
  updatedAt: string;
}

export interface StoredRecommendation {
  instrument: string;
  skillLevel: string;
  goals: string;
  recommendation: string;
  cached: boolean;
  updatedAt: string;
}

const PRACTICE_SETUP_KEY = "practice:last-setup";
const SESSION_SNAPSHOT_KEY = "practice:session-state";
const RECOMMENDATION_KEY = "practice:last-recommendation";

const readJson = <T,>(key: string): T | null => {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
};

const writeJson = (key: string, value: unknown) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

const removeItem = (key: string) => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
};

export const getStoredPracticeSetup = () =>
  readJson<StoredPracticeSetup>(PRACTICE_SETUP_KEY);

export const saveStoredPracticeSetup = (
  value: Omit<StoredPracticeSetup, "updatedAt">
) => {
  writeJson(PRACTICE_SETUP_KEY, {
    ...value,
    updatedAt: new Date().toISOString(),
  } satisfies StoredPracticeSetup);
};

export const clearStoredPracticeSetup = () => {
  removeItem(PRACTICE_SETUP_KEY);
};

export const getStoredSessionSnapshot = () =>
  readJson<StoredSessionSnapshot>(SESSION_SNAPSHOT_KEY);

export const saveStoredSessionSnapshot = (
  value: Omit<StoredSessionSnapshot, "updatedAt">
) => {
  writeJson(SESSION_SNAPSHOT_KEY, {
    ...value,
    updatedAt: new Date().toISOString(),
  } satisfies StoredSessionSnapshot);
};

export const clearStoredSessionSnapshot = () => {
  removeItem(SESSION_SNAPSHOT_KEY);
};

export const getStoredRecommendation = () =>
  readJson<StoredRecommendation>(RECOMMENDATION_KEY);

export const saveStoredRecommendation = (
  value: Omit<StoredRecommendation, "updatedAt">
) => {
  writeJson(RECOMMENDATION_KEY, {
    ...value,
    updatedAt: new Date().toISOString(),
  } satisfies StoredRecommendation);
};

export const clearStoredRecommendation = () => {
  removeItem(RECOMMENDATION_KEY);
};

// --- Per-instrument project persistence (Launch Pad) ---

export const INSTRUMENTS = ["Guitar", "Bass", "Drums", "Keys"] as const;
export type InstrumentName = (typeof INSTRUMENTS)[number];

export interface InstrumentProject {
  instrument: InstrumentName;
  songTitle: string;
  description: string;
  youtubeUrl: string;
  bpm: number;
  notes: string;
  mediaSource: StoredMediaSource;
  audioFileName: string | null;
  sheetMusicId: number | null;
  sheetMusicTitle: string | null;
  lastPracticedAt: string;
}

const PROJECTS_KEY = "practice:projects";

export const getAllProjects = (): Partial<Record<InstrumentName, InstrumentProject>> =>
  readJson<Partial<Record<InstrumentName, InstrumentProject>>>(PROJECTS_KEY) ?? {};

export const getProject = (instrument: InstrumentName): InstrumentProject | null => {
  const projects = getAllProjects();
  return projects[instrument] ?? null;
};

export const saveProject = (project: InstrumentProject): void => {
  const projects = getAllProjects();
  projects[project.instrument] = project;
  writeJson(PROJECTS_KEY, projects);
};

export const migrateFromLegacySetup = (): void => {
  const legacy = readJson<StoredPracticeSetup>(PRACTICE_SETUP_KEY);
  if (!legacy) return;

  const existingProjects = getAllProjects();
  if (Object.keys(existingProjects).length > 0) return;

  const instrumentName = legacy.instrument?.trim();
  if (!instrumentName) {
    removeItem(PRACTICE_SETUP_KEY);
    return;
  }

  const matchedInstrument = INSTRUMENTS.find(
    (i) => i.toLowerCase() === instrumentName.toLowerCase()
  );

  if (matchedInstrument) {
    saveProject({
      instrument: matchedInstrument,
      songTitle: "",
      description: legacy.description || "",
      youtubeUrl: legacy.youtubeUrl || "",
      bpm: 120,
      notes: "",
      mediaSource: legacy.mediaSource || "youtube",
      audioFileName: legacy.audioFileName ?? null,
      lastPracticedAt: legacy.updatedAt || new Date().toISOString(),
    });
  }

  removeItem(PRACTICE_SETUP_KEY);
};
