import { Box, IconButton, LinearProgress, Paper, Typography } from '@mui/material';
import { MdCheckCircle, MdClose, MdError } from 'react-icons/md';
import { useAppDispatch, useAppSelector } from '../store';
import { uploadsCleared } from '../store/uiSlice';

export default function UploadPanel() {
  const uploads = useAppSelector((s) => s.ui.uploads);
  const dispatch = useAppDispatch();

  if (uploads.length === 0) return null;

  const active = uploads.filter((u) => u.status === 'uploading').length;

  return (
    <Paper
      elevation={6}
      sx={{ position: 'fixed', right: 24, bottom: 24, width: 340, maxHeight: 360, overflow: 'auto', zIndex: 1300 }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle2" sx={{ flex: 1 }}>
          {active > 0 ? `Uploading ${active} file${active > 1 ? 's' : ''}` : 'Uploads complete'}
        </Typography>
        <IconButton size="small" onClick={() => dispatch(uploadsCleared())} aria-label="Clear finished uploads">
          <MdClose />
        </IconButton>
      </Box>
      {uploads.map((u) => (
        <Box key={u.id} sx={{ px: 2, py: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" noWrap sx={{ flex: 1 }}>
              {u.name}
            </Typography>
            {u.status === 'done' && <MdCheckCircle color="#2e7d32" />}
            {u.status === 'error' && <MdError color="#d32f2f" />}
          </Box>
          {u.status === 'uploading' && <LinearProgress variant="determinate" value={u.progress} sx={{ mt: 0.5 }} />}
          {u.status === 'error' && (
            <Typography variant="caption" color="error">
              {u.error}
            </Typography>
          )}
        </Box>
      ))}
    </Paper>
  );
}
