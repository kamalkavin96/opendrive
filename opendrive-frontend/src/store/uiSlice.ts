import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface UploadItem {
  id: string;
  name: string;
  progress: number;
  status: 'uploading' | 'done' | 'error';
  error?: string;
}

export interface Notice {
  message: string;
  severity: 'success' | 'error' | 'info';
}

interface UiState {
  uploads: UploadItem[];
  notice: Notice | null;
}

const initialState: UiState = { uploads: [], notice: null };

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    uploadAdded(state, action: PayloadAction<{ id: string; name: string }>) {
      state.uploads.push({ ...action.payload, progress: 0, status: 'uploading' });
    },
    uploadProgress(state, action: PayloadAction<{ id: string; progress: number }>) {
      const item = state.uploads.find((u) => u.id === action.payload.id);
      if (item) item.progress = action.payload.progress;
    },
    uploadFinished(state, action: PayloadAction<string>) {
      const item = state.uploads.find((u) => u.id === action.payload);
      if (item) {
        item.progress = 100;
        item.status = 'done';
      }
    },
    uploadFailed(state, action: PayloadAction<{ id: string; error: string }>) {
      const item = state.uploads.find((u) => u.id === action.payload.id);
      if (item) {
        item.status = 'error';
        item.error = action.payload.error;
      }
    },
    uploadsCleared(state) {
      state.uploads = state.uploads.filter((u) => u.status === 'uploading');
    },
    noticeShown(state, action: PayloadAction<Notice>) {
      state.notice = action.payload;
    },
    noticeCleared(state) {
      state.notice = null;
    },
  },
});

export const {
  uploadAdded,
  uploadProgress,
  uploadFinished,
  uploadFailed,
  uploadsCleared,
  noticeShown,
  noticeCleared,
} = uiSlice.actions;

export default uiSlice.reducer;
