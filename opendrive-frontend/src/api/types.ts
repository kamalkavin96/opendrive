export interface FolderResponse {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  color: string | null;
}

export interface FileResponse {
  name: any;
  id: string;
  fileName: string;
  contentType: string | null;
  fileSize: number;
  folderId: string | null;
  checksum: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FolderContents {
  folder: FolderResponse | null;
  breadcrumbs: FolderResponse[];
  folders: FolderResponse[];
  files: FileResponse[];
}

export type DriveItem =
  | {
      kind: 'folder';
      data: FolderResponse;
    }
  | {
      kind: 'file';
      data: FileResponse;
    };