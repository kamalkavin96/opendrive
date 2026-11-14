import { Alert, Snackbar } from '@mui/material';
import { useAppDispatch, useAppSelector } from '../store';
import { noticeCleared } from '../store/uiSlice';

export default function NotificationBar() {
  const notice = useAppSelector((s) => s.ui.notice);
  const dispatch = useAppDispatch();

  return (
    <Snackbar
      open={notice !== null}
      autoHideDuration={4000}
      onClose={() => dispatch(noticeCleared())}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      {notice ? (
        <Alert severity={notice.severity} variant="filled" onClose={() => dispatch(noticeCleared())}>
          {notice.message}
        </Alert>
      ) : undefined}
    </Snackbar>
  );
}
