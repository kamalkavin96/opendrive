import { Box } from '@mui/material';
import type { PreviewProps } from '../previewTypes';

export default function PdfPreview({ src }: Readonly<PreviewProps>) {
  return (
    <Box
      component="iframe"
      src={src}
      title="PDF Preview"
      sx={{
        width: '100%',
        height: '75vh',
        border: 0,
        display: 'block',
        bgcolor: '#fff',
      }}
    />
  );
}