import { Box } from '@mui/material';
import type { PreviewProps } from '../previewTypes';

export default function AudioPreview({ src }: Readonly<PreviewProps>) {
  return (
    <Box
      component="audio"
      src={src}
      controls
      sx={{ width: '100%' }}
    />
  );
}