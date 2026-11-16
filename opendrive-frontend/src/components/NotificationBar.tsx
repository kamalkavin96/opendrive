import { useState, type SyntheticEvent } from 'react';
import { Alert, Snackbar, type SnackbarCloseReason } from '@mui/material';
import { MdCheckCircle, MdError, MdInfo } from 'react-icons/md';
import { useAppDispatch, useAppSelector } from '../store';
import { noticeCleared, type Notice } from '../store/uiSlice';

const ICONS: Record<Notice['severity'], React.ReactNode> = {
  success: <MdCheckCircle size={22} />,
  error: <MdError size={22} />,
  info: <MdInfo size={22} />,
};

// Errors stay longer so the message can actually be read.
const DURATION: Record<Notice['severity'], number> = {
  success: 3500,
  info: 4000,
  error: 7000,
};

export default function NotificationBar() {
  const notice = useAppSelector((s) => s.ui.notice);
  const dispatch = useAppDispatch();

  // Remember the last notice so its text stays visible during the fade-out animation.
  const [displayed, setDisplayed] = useState<Notice | null>(notice);
  if (notice && notice !== displayed) {
    setDisplayed(notice);
  }

  const handleClose = (_event?: SyntheticEvent | Event, reason?: SnackbarCloseReason) => {
    if (reason === 'clickaway') return; // clicking elsewhere in the app must not dismiss it
    dispatch(noticeCleared());
  };

  const severity = displayed?.severity ?? 'info';

  return (
    <Snackbar
      open={notice !== null}
      autoHideDuration={DURATION[severity]}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        severity={severity}
        variant="outlined"
        icon={ICONS[severity]}
        onClose={() => handleClose()}
        sx={{
          alignItems: 'center',
          minWidth: { sm: 320 },
          maxWidth: 520,
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderColor: 'divider',
          borderLeft: 4,
          borderLeftColor: `${severity}.main`,
          boxShadow: 6,
          fontSize: 14,
          '& .MuiAlert-message': { py: 1 },
        }}
      >
        {displayed?.message}
      </Alert>
    </Snackbar>
  );
}