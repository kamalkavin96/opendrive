import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { filesApi, foldersApi } from '../api/driveApi';
import { errorMessage } from '../api/client';
import type { DriveItem } from '../api/types';
import { useAppDispatch } from '../store';
import {
  noticeShown,
  uploadAdded,
  uploadFailed,
  uploadFinished,
  uploadProgress,
} from '../store/uiSlice';

export function useContents(folderId?: string) {
  return useQuery({
    queryKey: ['contents', folderId ?? 'root'],
    queryFn: () => foldersApi.contents(folderId),
  });
}

export function useSearch(term: string) {
  return useQuery({
    queryKey: ['search', term],
    queryFn: () => filesApi.search(term),
    enabled: term.trim().length > 0,
  });
}

export function useDriveMutations() {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['contents'] }),
      queryClient.invalidateQueries({ queryKey: ['search'] }),
    ]);

  const succeed = (message: string) => {
    dispatch(noticeShown({ message, severity: 'success' }));
    return refresh();
  };
  const fail = (error: unknown) => {
    dispatch(noticeShown({ message: errorMessage(error), severity: 'error' }));
  };

  const createFolder = useMutation({
    mutationFn: ({ name, parentId }: { name: string; parentId?: string }) =>
      foldersApi.create(name, parentId),
    onSuccess: () => succeed('Folder created'),
    onError: fail,
  });

  const rename = useMutation({
    mutationFn: ({ item, name }: { item: DriveItem; name: string }) =>
      item.kind === 'folder'
        ? foldersApi.rename(item.data.id, name)
        : filesApi.rename(item.data.id, name),
    onSuccess: () => succeed('Renamed'),
    onError: fail,
  });

  const move = useMutation({
    mutationFn: ({ item, targetId }: { item: DriveItem; targetId: string | null }) =>
      item.kind === 'folder'
        ? foldersApi.move(item.data.id, targetId)
        : filesApi.move(item.data.id, targetId),
    onSuccess: () => succeed('Moved'),
    onError: fail,
  });

  const copyFile = useMutation({
    mutationFn: (id: string) => filesApi.copy(id),
    onSuccess: () => succeed('Copy created'),
    onError: fail,
  });

  const remove = useMutation({
    mutationFn: (item: DriveItem) =>
      item.kind === 'folder' ? foldersApi.remove(item.data.id) : filesApi.remove(item.data.id),
    onSuccess: () => succeed('Deleted'),
    onError: fail,
  });

  return { createFolder, rename, move, copyFile, remove };
}

const MAX_PARALLEL_UPLOADS = 3;
let uploadCounter = 0;

export function useUploader(folderId?: string) {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  return useCallback(
    async (files: File[]) => {
      const queue = [...files];

      const uploadOne = async (file: File) => {
        // Not crypto.randomUUID(): that needs a secure context, and self-hosted installs often use plain http.
        const id = `${Date.now()}-${uploadCounter++}`;
        dispatch(uploadAdded({ id, name: file.name }));
        try {
          await filesApi.upload(file, folderId, (progress) =>
            dispatch(uploadProgress({ id, progress })),
          );
          dispatch(uploadFinished(id));
        } catch (error) {
          dispatch(uploadFailed({ id, error: errorMessage(error) }));
        }
      };

      const worker = async () => {
        for (let file = queue.shift(); file; file = queue.shift()) {
          await uploadOne(file);
        }
      };

      await Promise.all(
        Array.from({ length: Math.min(MAX_PARALLEL_UPLOADS, files.length) }, worker),
      );
      await queryClient.invalidateQueries({ queryKey: ['contents'] });
      await queryClient.invalidateQueries({ queryKey: ['search'] });
    },
    [dispatch, folderId, queryClient],
  );
}
