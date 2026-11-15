import { useEffect, useState } from 'react';

import type { FileResponse } from '../api/types';
import { filesApi } from '../api/driveApi';
import { http } from '../api/client';

interface PreviewState {
  file: FileResponse | null;
  url: string | null;
  loading: boolean;
  error: string | null;
}

export function useFilePreview() {
  const [state, setState] = useState<PreviewState>({
    file: null,
    url: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!state.file) return;

    let objectUrl: string | null = null;
    let cancelled = false;

    async function loadPreview() {
      try {
        setState((previous) => ({
          ...previous,
          loading: true,
          error: null,
        }));

        const response = await http.get(
          filesApi.downloadUrl(state.file!.id),
          { responseType: 'blob' }
        );

        objectUrl = URL.createObjectURL(response.data);

        if (!cancelled) {
          setState((previous) => ({
            ...previous,
            url: objectUrl,
            loading: false,
          }));
        }
      } catch {
        if (!cancelled) {
          setState((previous) => ({
            ...previous,
            loading: false,
            error: 'Unable to load file preview.',
          }));
        }
      }
    }

    void loadPreview();

    return () => {
      cancelled = true;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [state.file]);

  const openPreview = (file: FileResponse) => {
    setState({
      file,
      url: null,
      loading: true,
      error: null,
    });
  };

  const closePreview = () => {
    setState({
      file: null,
      url: null,
      loading: false,
      error: null,
    });
  };

  return {
    ...state,
    openPreview,
    closePreview,
  };
}