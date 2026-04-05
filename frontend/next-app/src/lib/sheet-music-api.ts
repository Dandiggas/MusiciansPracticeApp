import axios from "axios";

const apiBaseUrl =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"
    : "http://localhost:8000/api/v1";

function authHeaders() {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Token ${token}` } : {};
}

export interface SheetMusicRecord {
  id: number;
  title: string;
  file: string;
  file_size: number;
  page_count: number;
  file_hash: string;
  last_page_viewed: number;
  created_at: string;
  updated_at: string;
}

export async function listSheetMusic(): Promise<SheetMusicRecord[]> {
  const res = await axios.get<SheetMusicRecord[]>(
    `${apiBaseUrl}/sheet-music/`,
    { headers: authHeaders() }
  );
  return res.data;
}

export async function getSheetMusic(id: number): Promise<SheetMusicRecord> {
  const res = await axios.get<SheetMusicRecord>(
    `${apiBaseUrl}/sheet-music/${id}/`,
    { headers: authHeaders() }
  );
  return res.data;
}

export async function uploadSheetMusic(
  title: string,
  file: File
): Promise<SheetMusicRecord> {
  const form = new FormData();
  form.append("title", title);
  form.append("file", file);
  const res = await axios.post<SheetMusicRecord>(
    `${apiBaseUrl}/sheet-music/`,
    form,
    { headers: authHeaders() }
  );
  return res.data;
}

export async function updateSheetMusic(
  id: number,
  data: { title?: string; last_page_viewed?: number }
): Promise<SheetMusicRecord> {
  const res = await axios.patch<SheetMusicRecord>(
    `${apiBaseUrl}/sheet-music/${id}/`,
    data,
    { headers: authHeaders() }
  );
  return res.data;
}

export async function deleteSheetMusic(id: number): Promise<void> {
  await axios.delete(`${apiBaseUrl}/sheet-music/${id}/`, {
    headers: authHeaders(),
  });
}

export function getSheetMusicFileUrl(id: number): string {
  return `${apiBaseUrl}/sheet-music/${id}/file/`;
}
