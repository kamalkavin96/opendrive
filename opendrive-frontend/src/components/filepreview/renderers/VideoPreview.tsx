import { Box } from '@mui/material';
import type { PreviewProps } from '../previewTypes';

export default function VideoPreview({
    file,
    src,
}: Readonly<PreviewProps>) {
    return (
        <Box
            component="video"
            src={src}
            controls
            autoPlay
            playsInline
            preload="metadata"
            sx={{
                display: 'block',
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                bgcolor: '#000',
            }}
        >
            Your browser does not support video playback.
        </Box>
    );
}