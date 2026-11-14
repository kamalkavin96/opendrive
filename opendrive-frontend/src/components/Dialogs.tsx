import { useState, type FormEvent } from 'react';
import {
  Box,
  Breadcrumbs,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import { MdArrowUpward, MdFolder } from 'react-icons/md';
import type { DriveItem } from '../api/types';
import { useContents } from '../hooks/useDrive';

interface NameDialogProps {
  title: string;
  label: string;
  initialValue?: string;
  confirmLabel: string;
  onSubmit: (value: string) => Promise<unknown>;
  onClose: () => void;
}

/** Reusable single-field dialog for "New folder" and "Rename". */
export function NameDialog({ title, label, initialValue = '', confirmLabel, onSubmit, onClose }: NameDialogProps) {
  const [value, setValue] = useState(initialValue);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!value.trim()) return;
    setBusy(true);
    try {
      await onSubmit(value.trim());
      onClose();
    } catch {
      // The mutation already reported the error; keep the dialog open so the name can be fixed.
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <form onSubmit={submit}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label={label}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={(e) => e.target.select()}
            slotProps={{ htmlInput: { maxLength: 255 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy || !value.trim()}>
            {confirmLabel}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

interface ConfirmDeleteDialogProps {
  item: DriveItem;
  onConfirm: () => Promise<unknown>;
  onClose: () => void;
}

export function ConfirmDeleteDialog({ item, onConfirm, onClose }: ConfirmDeleteDialogProps) {
  const [busy, setBusy] = useState(false);
  const name = item.kind === 'folder' ? item.data.name : item.data.fileName;

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Delete "{name}"?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {item.kind === 'folder'
            ? 'The folder and everything inside it will be removed.'
            : 'The file will be removed.'}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button color="error" variant="contained" onClick={confirm} disabled={busy}>
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}

interface MoveDialogProps {
  item: DriveItem;
  onMove: (targetId: string | null) => Promise<unknown>;
  onClose: () => void;
}

/** Folder picker: browse into folders, then "Move here". Mount only while open. */
export function MoveDialog({ item, onMove, onClose }: MoveDialogProps) {
  const [browseId, setBrowseId] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const { data, isLoading } = useContents(browseId);

  const currentParent = item.kind === 'folder' ? item.data.parentId : item.data.folderId;
  const isCurrentLocation = (browseId ?? null) === currentParent;
  const selectable = (data?.folders ?? []).filter((f) => !(item.kind === 'folder' && f.id === item.data.id));
  // Moving a folder into itself is blocked server-side; also hide the path that would lead there.
  const insideSelf = item.kind === 'folder' && (data?.breadcrumbs ?? []).some((f) => f.id === item.data.id);

  const move = async () => {
    setBusy(true);
    try {
      await onMove(browseId ?? null);
      onClose();
    } catch {
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Move to…</DialogTitle>
      <DialogContent dividers sx={{ minHeight: 280 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <IconButton
            size="small"
            disabled={!browseId}
            onClick={() => setBrowseId(data?.folder?.parentId ?? undefined)}
            aria-label="Up one level"
          >
            <MdArrowUpward />
          </IconButton>
          <Breadcrumbs maxItems={3}>
            <Typography variant="body2">My files</Typography>
            {(data?.breadcrumbs ?? []).map((f) => (
              <Typography key={f.id} variant="body2">
                {f.name}
              </Typography>
            ))}
          </Breadcrumbs>
        </Box>

        {isLoading ? (
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : selectable.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            No subfolders here.
          </Typography>
        ) : (
          <List dense>
            {selectable.map((f) => (
              <ListItemButton key={f.id} onClick={() => setBrowseId(f.id)}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <MdFolder size={22} color="#f0b429" />
                </ListItemIcon>
                <ListItemText primary={f.name} />
              </ListItemButton>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={move} disabled={busy || isCurrentLocation || insideSelf}>
          Move here
        </Button>
      </DialogActions>
    </Dialog>
  );
}
