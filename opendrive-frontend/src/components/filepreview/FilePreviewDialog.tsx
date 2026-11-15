import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
} from '@mui/material';

import { MdClose, MdDownload } from 'react-icons/md';

import type { FileResponse } from '../../api/types';
import { filesApi } from '../../api/driveApi';

import FilePreviewContent from './FilePreviewContent';

interface Props {
  file: FileResponse | null;
  previewUrl: string | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

export default function FilePreviewDialog({
  file,
  previewUrl,
  onClose,
}: Readonly<Props>) {
  if (!file || !previewUrl) return null;

  return (
    <Dialog
      open={Boolean(file)}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2,
            overflow: 'hidden',
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 1.5,
        }}
      >
        <Typography fontWeight={600} noWrap>
          {file.fileName}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton
            component="a"
            href={filesApi.downloadUrl(file.id)}
            aria-label="Download file"
          >
            <MdDownload />
          </IconButton>

          <IconButton
            onClick={onClose}
            aria-label="Close preview"
          >
            <MdClose />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{
          p: 2,
          minHeight: 300,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <FilePreviewContent
          file={file}
          src={previewUrl}
        />
      </DialogContent>
    </Dialog>
  );
}