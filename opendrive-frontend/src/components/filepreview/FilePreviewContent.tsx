import { Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';

import type { FileResponse } from '../../api/types';
import { getPreviewDefinition } from '../../utils/filePreviewUtils';

interface Props {
    file: FileResponse;
    src: string;
}

export default function FilePreviewContent({
    file,
    src,
}: Readonly<Props>) {
    const { component: PreviewComponent } = getPreviewDefinition(file);

    return (
        <Suspense
            fallback={
                <Box
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <CircularProgress size={28} sx={{ color: '#ffffff' }} />
                </Box>
            }
        >
            <PreviewComponent file={file} src={src} />
        </Suspense>
    );
}