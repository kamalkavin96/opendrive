import { Box } from '@mui/material';
import type { PreviewProps } from '../previewTypes';

export default function VideoPreview({ src }: Readonly<PreviewProps>) {
  return (
    <Box
      component="video"
      src={src}
      controls
      autoPlay
      playsInline
      sx={{
        width: '100%',
        maxHeight: '100%',
        outline: 'none',
      }}
    />
  );
}