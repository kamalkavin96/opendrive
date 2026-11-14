import { API_BASE, http } from './client';
import type { FileResponse, FolderContents, FolderResponse } from './types';

export const foldersApi = {
  contents: (folderId?: string) =>
    http
      .get<FolderContents>(folderId ? `/folders/${folderId}/contents` : '/folders/root/contents')
      .then((r) => r.data),

  create: (name: string, parentId?: string, color?: string,) =>
    http.post<FolderResponse>('/folders', { name, parentId: parentId ?? null, color: color ?? null, }).then((r) => r.data),

  rename: (id: string, name: string, color?: string) =>
    http.put(`/folders/${id}/rename`, { name, color }).then(() => undefined),

  move: (id: string, targetFolderId: string | null) =>
    http.put(`/folders/${id}/move`, { targetFolderId }).then(() => undefined),

  remove: (id: string) => http.delete(`/folders/${id}`).then(() => undefined),
};

export const filesApi = {
  search: (name: string) =>
    http.get<FileResponse[]>('/files/search', { params: { name } }).then((r) => r.data),

  upload: (file: File, folderId: string | undefined, onProgress: (percent: number) => void) => {
    const form = new FormData();
    form.append('file', file);
    if (folderId) form.append('folderId', folderId);
    return http
      .post<FileResponse>('/files/upload', form, {
        onUploadProgress: (e) => {
          if (e.total) onProgress(Math.round((e.loaded / e.total) * 100));
        },
      })
      .then((r) => r.data);
  },

  rename: (id: string, name: string) =>
    http.put(`/files/${id}/rename`, { name }).then(() => undefined),

  move: (id: string, targetFolderId: string | null) =>
    http.put(`/files/${id}/move`, { targetFolderId }).then(() => undefined),

  copy: (id: string) => http.post(`/files/${id}/copy`).then(() => undefined),

  remove: (id: string) => http.delete(`/files/${id}`).then(() => undefined),

  downloadUrl: (id: string) => `${API_BASE}/files/${id}/download`,

  uploadFolder: (files: File[], targetFolderId?: string,) => {
    const formData = new FormData();

    files.forEach((file) => {
      const relativePath = (
        file as File & { webkitRelativePath?: string }
      ).webkitRelativePath;

      formData.append('files', file, file.name);
      formData.append('paths', relativePath || file.name);
    });

    if (targetFolderId) {
      formData.append('targetFolderId', targetFolderId);
    }

    return http.post<{
      totalFiles: number;
      uploadedFiles: number;
      createdFolders: number;
      files: FileResponse[];
    }>('/files/upload-folder', formData)
      .then(response => response.data);
  },
};
