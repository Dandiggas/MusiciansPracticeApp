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
