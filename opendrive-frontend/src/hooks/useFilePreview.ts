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

        const currentFile = state.file;

        async function loadPreview() {
            try {
                setState((previous) => ({
                    ...previous,
                    loading: true,
                    error: null,
                }));

                // Video: use native browser streaming.
                if (currentFile.contentType?.startsWith('video/')) {
                    setState((previous) => ({
                        ...previous,
                        url: filesApi.streamUrl(currentFile.id),
                        loading: false,
                        error: null,
                    }));

                    return;
                }

                // Other formats: authenticated Axios Blob preview.
                const response = await http.get(
                    filesApi.downloadPath(currentFile.id),
                    {
                        responseType: 'blob',
                    },
                );

                objectUrl = URL.createObjectURL(response.data);

                if (!cancelled) {
                    setState((previous) => ({
                        ...previous,
                        url: objectUrl,
                        loading: false,
                        error: null,
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