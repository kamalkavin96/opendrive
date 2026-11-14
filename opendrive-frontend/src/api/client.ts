import axios from 'axios';

export const API_BASE: string = import.meta.env.VITE_API_BASE_URL ?? '/api';

export const http = axios.create({ baseURL: API_BASE });

/** Extracts the backend's problem-detail message when available. */
export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { detail?: string } | undefined;
    return data?.detail ?? error.message;
  }
  return error instanceof Error ? error.message : 'Something went wrong';
}
