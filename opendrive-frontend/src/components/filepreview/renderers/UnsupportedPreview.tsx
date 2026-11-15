import { Box, Typography } from '@mui/material';
import { MdInsertDriveFile } from 'react-icons/md';
import type { PreviewProps } from '../previewTypes';

export default function UnsupportedPreview({ file }: Readonly<PreviewProps>) {
  return (
    <Box
      sx={{
        minHeight: 300,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      <MdInsertDriveFile size={64} />

      <Typography fontWeight={600}>
        Preview not available
      </Typography>

      <Typography color="text.secondary">
        {file.fileName}
      </Typography>
    </Box>
  );
}