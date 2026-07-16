export type TrackSourceType = "youtube" | "mp3" | "pdf" | "image" | "none";
export type TakeCaptureMode = "audio" | "video" | "video_audio";

export interface Lick {
  id: number;
  track: number;
  name: string;
  start_seconds: number;
  end_seconds: number;
  last_speed: number | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Take {
  id: number;
  track: number;
  name: string;
  capture_mode: TakeCaptureMode;
  file: string;
  created_at: string;
  updated_at: string;
}

export interface Track {
  id: number;
  session: number;
  name: string;
  note: string;
  called_key: string;
  source_type: TrackSourceType;
  youtube_url: string;
  file: string | null;
  bpm: number | null;
  last_speed: number | null;
  position: number;
  licks: Lick[];
  takes: Take[];
  created_at: string;
  updated_at: string;
}

export interface SessionSummary {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface SessionDetail extends SessionSummary {
  tracks: Track[];
}
