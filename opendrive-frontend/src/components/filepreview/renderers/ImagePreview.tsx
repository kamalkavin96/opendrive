import { Box } from '@mui/material';
import type { PreviewProps } from '../previewTypes';

export default function ImagePreview({ file, src }: Readonly<PreviewProps>) {
  return (
    <Box
      component="img"
      src={src}
      alt={file.fileName}
      sx={{
        display: 'block',
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'contain',
        mx: 'auto',
      }}
    />
  );
}