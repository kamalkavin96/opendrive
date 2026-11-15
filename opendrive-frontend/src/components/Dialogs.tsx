import { useState, type FormEvent } from 'react';

import {
  Alert,
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
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';

import {
  MdArrowUpward,
  MdCheck,
  MdFilePresent,
  MdFolder,
  MdInsertDriveFile,
} from 'react-icons/md';

import type { DriveItem } from '../api/types';
import { useContents } from '../hooks/useDrive';

import {
  FOLDER_COLORS,
  DEFAULT_FOLDER_COLOR,
} from '../constants/folderColors';
import { getFileIcon } from './FileIcon';

// --------------------------------------------------
// Shared styles
// --------------------------------------------------

const dialogSx = {
  '& .MuiDialog-paper': {
    borderRadius: 3,
    overflow: 'hidden',
  },
};

const titleSx = {
  fontWeight: 700,
  fontSize: '1.2rem',
  pb: 1,
};

const actionSx = {
  px: 3,
  py: 2,
  gap: 1,
};

// --------------------------------------------------
// Name Dialog
// Create folder, rename folder and rename file.
// --------------------------------------------------

interface NameDialogProps {
  title: string;
  label: string;
  initialValue?: string;
  confirmLabel: string;
  showFolderColor?: boolean;
  initialColor?: string;
  onSubmit: (value: string, color?: string) => Promise<unknown>;
  onClose: () => void;
}

export function NameDialog({
  title,
  label,
  initialValue = '',
  confirmLabel,
  showFolderColor = false,
  initialColor = DEFAULT_FOLDER_COLOR,
  onSubmit,
  onClose,
}: Readonly<NameDialogProps>) {
  const [value, setValue] = useState(initialValue);
  const [color, setColor] = useState(initialColor);
  const [busy, setBusy] = useState(false);

  const isRename = initialValue.length > 0;

  const hasChanges =
    value.trim() !== initialValue.trim() ||
    (showFolderColor && color !== initialColor);

  const canSubmit =
    value.trim().length > 0 &&
    (!isRename || hasChanges) &&
    !busy;

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    const trimmedValue = value.trim();

    if (!trimmedValue || busy || !canSubmit) return;

    setBusy(true);

    try {
      await onSubmit(
        trimmedValue,
        showFolderColor ? color : undefined,
      );

      onClose();
    } catch {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="xs"
      sx={dialogSx}
    >
      <form onSubmit={submit}>
        <DialogTitle sx={titleSx}>
          {title}

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 0.5,
              fontWeight: 400,
            }}
          >
            {showFolderColor
              ? isRename
                ? 'Update your folder name or appearance.'
                : 'Create a folder to organize your files.'
              : isRename
                ? 'Update the name of your item.'
                : 'Enter a name to continue.'}
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ pt: '12px !important' }}>
          <TextField
            autoFocus
            fullWidth
            label={label}
            placeholder="Enter name"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onFocus={(event) => event.target.select()}
            disabled={busy}
            slotProps={{
              htmlInput: {
                maxLength: 255,
              },
            }}
          />

          {/* Folder color selector */}

          {showFolderColor && (
            <Box sx={{ mt: 3 }}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 1.5 }}
              >
                <Typography
                  fontWeight={600}
                  fontSize={14}
                >
                  Folder color
                </Typography>

                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  {color.toUpperCase()}
                </Typography>
              </Stack>

              <Stack
                direction="row"
                flexWrap="wrap"
                gap={1.3}
              >
                {FOLDER_COLORS.map((itemColor) => {
                  const selected = color === itemColor;

                  return (
                    <Tooltip
                      key={itemColor}
                      title={itemColor}
                    >
                      <Box
                        component="button"
                        type="button"
                        disabled={busy}
                        onClick={() => setColor(itemColor)}
                        aria-label={`Select folder color ${itemColor}`}
                        aria-pressed={selected}
                        sx={{
                          width: 34,
                          height: 34,
                          borderRadius: '50%',
                          bgcolor: itemColor,
                          border: selected
                            ? '3px solid'
                            : '2px solid transparent',
                          borderColor: selected
                            ? 'text.primary'
                            : 'transparent',
                          outline: selected
                            ? '2px solid'
                            : 'none',
                          outlineColor: 'background.paper',
                          cursor: busy ? 'default' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'transform 0.15s ease',
                          '&:hover': {
                            transform: 'scale(1.12)',
                          },
                          '&:focus-visible': {
                            outline: '2px solid',
                            outlineColor: 'primary.main',
                          },
                        }}
                      >
                        {selected && (
                          <MdCheck
                            color="#ffffff"
                            size={19}
                          />
                        )}
                      </Box>
                    </Tooltip>
                  );
                })}
              </Stack>

              {/* Folder preview */}

              <Box
                sx={{
                  mt: 2.5,
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: 'action.hover',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                <MdFolder
                  size={30}
                  color={color}
                />

                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    fontWeight={600}
                    fontSize={14}
                    noWrap
                  >
                    {value.trim() || 'New folder'}
                  </Typography>

                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    Folder preview
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={actionSx}>
          <Button
            color="inherit"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="contained"
            disableElevation
            disabled={!canSubmit}
            startIcon={
              busy ? (
                <CircularProgress
                  size={16}
                  color="inherit"
                />
              ) : undefined
            }
            sx={{
              borderRadius: 2,
              px: 2.5,
            }}
          >
            {busy ? 'Please wait...' : confirmLabel}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// --------------------------------------------------
// Confirm Delete Dialog
// --------------------------------------------------

interface ConfirmDeleteDialogProps {
  item: DriveItem;
  onConfirm: () => Promise<unknown>;
  onClose: () => void;
}

export function ConfirmDeleteDialog({
  item,
  onConfirm,
  onClose,
}: Readonly<ConfirmDeleteDialogProps>) {
  const [busy, setBusy] = useState(false);

  const name =
    item.kind === 'folder'
      ? item.data.name
      : item.data.fileName;

  const confirm = async () => {
    if (busy) return;

    setBusy(true);

    try {
      await onConfirm();
      onClose();
    } catch {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="xs"
      sx={dialogSx}
    >
      <DialogTitle sx={titleSx}>
        Delete item?

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 0.5,
            fontWeight: 400,
          }}
        >
          Are you sure you want to delete this item?
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 2,
            borderRadius: 2,
            bgcolor: 'action.hover',
            mb: 2,
            minWidth: 0,
          }}
        >

          {(() => {
            if (item.kind === 'folder') {
              return <MdFolder size={28} color={item.data.color ?? undefined} />;
            }

            const { icon: Icon, color } = getFileIcon(item.data.fileName);

            return <Icon size={28} color={color} />;
          })()}

          <Typography
            fontWeight={600}
            noWrap
          >
            {name}
          </Typography>
        </Box>

        <DialogContentText>
          {item.kind === 'folder'
            ? 'The folder and everything inside it will be permanently removed.'
            : 'This file will be permanently removed.'}
        </DialogContentText>
      </DialogContent>

      <DialogActions sx={actionSx}>
        <Button
          color="inherit"
          onClick={onClose}
          disabled={busy}
        >
          Cancel
        </Button>

        <Button
          color="error"
          variant="contained"
          disableElevation
          onClick={confirm}
          disabled={busy}
          startIcon={
            busy ? (
              <CircularProgress
                size={16}
                color="inherit"
              />
            ) : undefined
          }
          sx={{
            borderRadius: 2,
            px: 2.5,
          }}
        >
          {busy ? 'Deleting...' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// --------------------------------------------------
// Move Dialog
// --------------------------------------------------

interface MoveDialogProps {
  item: DriveItem;
  onMove: (targetId: string | null) => Promise<unknown>;
  onClose: () => void;
}

export function MoveDialog({
  item,
  onMove,
  onClose,
}: Readonly<MoveDialogProps>) {
  const [browseId, setBrowseId] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useContents(browseId);

  const currentParent =
    item.kind === 'folder'
      ? item.data.parentId
      : item.data.folderId;

  const isCurrentLocation =
    (browseId ?? null) === currentParent;

  const selectable = (data?.folders ?? []).filter(
    (folder) =>
      !(item.kind === 'folder' && folder.id === item.data.id),
  );

  const insideSelf =
    item.kind === 'folder' &&
    (data?.breadcrumbs ?? []).some(
      (folder) => folder.id === item.data.id,
    );

  const move = async () => {
    if (busy || isCurrentLocation || insideSelf) return;

    setBusy(true);

    try {
      await onMove(browseId ?? null);
      onClose();
    } catch {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      sx={dialogSx}
    >
      <DialogTitle sx={titleSx}>
        Move to folder

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 0.5,
            fontWeight: 400,
          }}
        >
          Select the destination for this item.
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {/* Breadcrumb navigation */}

        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{
            p: 1,
            borderRadius: 2,
            bgcolor: 'action.hover',
            mb: 2,
            minWidth: 0,
          }}
        >
          <IconButton
            size="small"
            disabled={!browseId || busy || isLoading}
            onClick={() =>
              setBrowseId(
                data?.folder?.parentId ?? undefined,
              )
            }
            aria-label="Go to parent folder"
          >
            <MdArrowUpward />
          </IconButton>

          <Breadcrumbs
            maxItems={3}
            sx={{ minWidth: 0 }}
          >
            <Typography
              variant="body2"
              fontWeight={500}
            >
              My files
            </Typography>

            {(data?.breadcrumbs ?? []).map((folder) => (
              <Typography
                key={folder.id}
                variant="body2"
                noWrap
              >
                {folder.name}
              </Typography>
            ))}
          </Breadcrumbs>
        </Stack>

        {/* Loading */}

        {isLoading ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 5,
            }}
          >
            <CircularProgress size={28} />

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1 }}
            >
              Loading folders...
            </Typography>
          </Box>
        ) : error ? (
          <Box sx={{ py: 2 }}>
            <Alert
              severity="error"
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => void refetch()}
                >
                  Retry
                </Button>
              }
            >
              Unable to load folders.
            </Alert>
          </Box>
        ) : selectable.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 5,
            }}
          >
            <MdFolder
              size={42}
              color="#9E9E9E"
            />

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1 }}
            >
              No subfolders here.
            </Typography>
          </Box>
        ) : (
          <List
            dense
            sx={{
              maxHeight: 300,
              overflowY: 'auto',
            }}
          >
            {selectable.map((folder) => (
              <ListItemButton
                key={folder.id}
                disabled={busy}
                onClick={() => setBrowseId(folder.id)}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                }}
              >
                <ListItemIcon
                  sx={{ minWidth: 40 }}
                >
                  <MdFolder
                    size={24}
                    color="#F9A825"
                  />
                </ListItemIcon>

                <ListItemText
                  primary={folder.name}
                  slotProps={{
                    primary: {
                      fontWeight: 500,
                      noWrap: true,
                    },
                  }}
                />
              </ListItemButton>
            ))}
          </List>
        )}

        {/* Validation messages */}

        {isCurrentLocation && (
          <Alert
            severity="info"
            sx={{ mt: 2 }}
          >
            This item is already in this location.
          </Alert>
        )}

        {insideSelf && (
          <Alert
            severity="warning"
            sx={{ mt: 2 }}
          >
            A folder cannot be moved inside itself.
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={actionSx}>
        <Button
          color="inherit"
          onClick={onClose}
          disabled={busy}
        >
          Cancel
        </Button>

        <Button
          variant="contained"
          disableElevation
          onClick={move}
          disabled={
            busy ||
            isCurrentLocation ||
            insideSelf ||
            isLoading ||
            !!error
          }
          startIcon={
            busy ? (
              <CircularProgress
                size={16}
                color="inherit"
              />
            ) : undefined
          }
          sx={{
            borderRadius: 2,
            px: 2.5,
          }}
        >
          {busy ? 'Moving...' : 'Move here'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// --------------------------------------------------
// Folder Upload Confirmation Dialog
// --------------------------------------------------

interface FolderUploadConfirmDialogProps {
  folderName: string;
  files: File[];
  onConfirm: () => Promise<unknown>;
  onClose: () => void;
}

interface FolderTreeNode {
  name: string;
  type: 'folder' | 'file';
  children: Map<string, FolderTreeNode>;
}

function buildFolderTree(files: File[]): FolderTreeNode {
  const root: FolderTreeNode = {
    name: 'root',
    type: 'folder',
    children: new Map(),
  };

  files.forEach((file) => {
    const relativePath = (
      file as File & { webkitRelativePath?: string }
    ).webkitRelativePath || file.name;

    const segments = relativePath.split('/').filter(Boolean);

    let current = root;

    segments.forEach((segment, index) => {
      const isFile = index === segments.length - 1;

      if (!current.children.has(segment)) {
        current.children.set(segment, {
          name: segment,
          type: isFile ? 'file' : 'folder',
          children: new Map(),
        });
      }

      const node = current.children.get(segment)!;

      if (!isFile) {
        current = node;
      }
    });
  });

  return root;
}

export function FolderUploadConfirmDialog({
  folderName,
  files,
  onConfirm,
  onClose,
}: Readonly<FolderUploadConfirmDialogProps>) {

  const [busy, setBusy] = useState(false);

  const tree = buildFolderTree(files);

  const renderTree = (
    node: FolderTreeNode,
    depth = 0,
  ): React.ReactNode => {

    const children = Array.from(node.children.values())
      .sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }

        return a.name.localeCompare(b.name);
      });

    return children.map((child) => (
      <Box key={`${depth}-${child.name}`}>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{
            py: 0.65,
            pl: depth * 2,
            minWidth: 0,
          }}
        >
          {child.type === 'folder' ? (
            <MdFolder
              size={20}
              color={DEFAULT_FOLDER_COLOR}
            />
          ) : (
            <MdInsertDriveFile
              size={18}
              color="#78909C"
            />
          )}

          <Typography
            variant="body2"
            noWrap
            sx={{
              fontWeight: child.type === 'folder' ? 600 : 400,
              minWidth: 0,
            }}
          >
            {child.name}
          </Typography>
        </Stack>

        {child.type === 'folder' && renderTree(child, depth + 1)}
      </Box>
    ));
  };

  const confirm = async () => {
    if (busy) return;

    setBusy(true);

    try {
      await onConfirm();
      onClose();
    } catch {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      sx={dialogSx}
    >
      <DialogTitle sx={titleSx}>
        Upload folder?

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 0.5,
            fontWeight: 400,
          }}
        >
          Review the folder structure before uploading.
        </Typography>
      </DialogTitle>

      <DialogContent>

        {/* Folder information */}

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 2,
            borderRadius: 2,
            bgcolor: 'action.hover',
            mb: 2,
          }}
        >
          <MdFolder
            size={34}
            color={DEFAULT_FOLDER_COLOR}
          />

          <Box sx={{ minWidth: 0 }}>
            <Typography
              fontWeight={600}
              noWrap
            >
              {folderName}
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
            >
              {files.length} {files.length === 1 ? 'file' : 'files'} selected
            </Typography>
          </Box>
        </Box>

        {/* Folder tree */}

        <Typography
          fontWeight={600}
          fontSize={14}
          sx={{ mb: 1 }}
        >
          Folder structure
        </Typography>

        <Box
          sx={{
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
            p: 1.5,
            maxHeight: 300,
            overflowY: 'auto',
          }}
        >
          {renderTree(tree)}
        </Box>

        <DialogContentText sx={{ mt: 2 }}>
          The folder hierarchy will be preserved when uploaded
          to your current location.
        </DialogContentText>

      </DialogContent>

      <DialogActions sx={actionSx}>
        <Button
          color="inherit"
          onClick={onClose}
          disabled={busy}
        >
          Cancel
        </Button>

        <Button
          variant="contained"
          disableElevation
          onClick={confirm}
          disabled={busy || files.length === 0}
          startIcon={
            busy ? (
              <CircularProgress
                size={16}
                color="inherit"
              />
            ) : undefined
          }
          sx={{
            borderRadius: 2,
            px: 2.5,
          }}
        >
          {busy ? 'Uploading...' : 'Upload'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}