import { API_BASE, http } from './client';
import type { FileResponse, FolderContents, FolderResponse } from './types';

export const foldersApi = {
  contents: (folderId?: string) =>
    http
      .get<FolderContents>(
        folderId
          ? `/folders/${folderId}/contents`
          : '/folders/root/contents',
      )
      .then((r) => r.data),

  create: (name: string, parentId?: string, color?: string) =>
    http
      .post<FolderResponse>('/folders', {
        name,
        parentId: parentId ?? null,
        color: color ?? null,
      })
      .then((r) => r.data),

  rename: (id: string, name: string, color?: string) =>
    http.put(`/folders/${id}/rename`, { name, color })
      .then(() => undefined),

  move: (id: string, targetFolderId: string | null) =>
    http.put(`/folders/${id}/move`, { targetFolderId })
      .then(() => undefined),

  remove: (id: string) =>
    http.delete(`/folders/${id}`).then(() => undefined),
};

export const filesApi = {
  search: (name: string) =>
    http
      .get<FileResponse[]>('/files/search', { params: { name } })
      .then((r) => r.data),

  upload: (
    file: File,
    folderId: string | undefined,
    onProgress: (percent: number) => void,
  ) => {
    const form = new FormData();
    form.append('file', file);

    if (folderId) form.append('folderId', folderId);

    return http
      .post<FileResponse>('/files/upload', form, {
        onUploadProgress: (e) => {
          if (e.total) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        },
      })
      .then((r) => r.data);
  },

  rename: (id: string, name: string) =>
    http.put(`/files/${id}/rename`, { name })
      .then(() => undefined),

  move: (id: string, targetFolderId: string | null) =>
    http.put(`/files/${id}/move`, { targetFolderId })
      .then(() => undefined),

  copy: (id: string) =>
    http.post(`/files/${id}/copy`).then(() => undefined),

  remove: (id: string) =>
    http.delete(`/files/${id}`).then(() => undefined),

  // Browser navigation URL (includes API prefix)
  downloadUrl: (id: string) =>
    `${API_BASE.replace(/\/$/, '')}/files/${id}/download`,

  // Authenticated download through Axios
  // download: async (id: string) => {
  //   const response = await http.get(
  //     `/files/${id}/download`,
  //     { responseType: 'blob' },
  //   );

  //   const blobUrl = URL.createObjectURL(response.data);

  //   const anchor = document.createElement('a');
  //   anchor.href = blobUrl;
  //   anchor.download = 'download';
  //   document.body.appendChild(anchor);
  //   anchor.click();
  //   anchor.remove();

  //   URL.revokeObjectURL(blobUrl);
  // },

  uploadFolder: (files: File[], targetFolderId?: string) => {
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

    return http
      .post<{
        totalFiles: number;
        uploadedFiles: number;
        createdFolders: number;
        files: FileResponse[];
      }>('/files/upload-folder', formData)
      .then((response) => response.data);
  },

  streamUrl: (id: string) => `${API_BASE.replace(/\/$/, '')}/files/${id}/stream`,
  downloadPath: (id: string) => `/files/${id}/download`,

  download: async (id: string, fileName: string) => {
    const response = await http.get(
      `/files/${id}/download`,
      {
        responseType: 'blob',
      },
    );

    const blobUrl = URL.createObjectURL(response.data);

    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = fileName;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  },

  saveContent: async (
    id: string,
    blob: Blob,
    fileName: string,
    expectedChecksum?: string,
  ): Promise<FileResponse> => {
    const form = new FormData();
    form.append('file', blob, fileName);

    const res = await http.put<FileResponse>(`/files/${id}/content`, form, {
      params: expectedChecksum ? { expectedChecksum } : undefined,
    });
    return res.data;
  },
};