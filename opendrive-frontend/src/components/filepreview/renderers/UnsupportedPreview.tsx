import { Box, Typography } from '@mui/material';
import { MdInsertDriveFile } from 'react-icons/md';

import type { PreviewProps } from '../previewTypes';

export default function UnsupportedPreview({
  file,
}: Readonly<PreviewProps>) {
  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        minHeight: 300,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.5,
        bgcolor: 'transparent',
        color: '#ffffff',
        textAlign: 'center',
        p: 3,
      }}
    >
      <Box
        sx={{
          width: 100,
          height: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 3,
          bgcolor: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        <MdInsertDriveFile
          size={56}
          color="rgba(255,255,255,0.75)"
        />
      </Box>

      <Typography
        fontSize={16}
        fontWeight={600}
        sx={{ mt: 1 }}
      >
        Preview not available
      </Typography>

      <Typography
        fontSize={13}
        sx={{
          color: 'rgba(255,255,255,0.65)',
          wordBreak: 'break-word',
          maxWidth: 400,
        }}
      >
        {file.fileName}
      </Typography>

      <Typography
        fontSize={12}
        sx={{
          color: 'rgba(255,255,255,0.45)',
          mt: 0.5,
        }}
      >
        This file format is not currently supported for preview.
      </Typography>
    </Box>
  );
}