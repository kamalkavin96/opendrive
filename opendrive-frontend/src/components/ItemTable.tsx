import { useState, type MouseEvent } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

import {
  Box,
  Divider,
  IconButton,
  Link,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

import {
  MdContentCopy,
  MdDelete,
  MdDownload,
  MdDriveFileMove,
  MdDriveFileRenameOutline,
  MdFolderOpen,
  MdMoreVert,
} from 'react-icons/md';

import { filesApi } from '../api/driveApi';
import type { DriveItem, FileResponse, FolderResponse } from '../api/types';

import { useDriveMutations } from '../hooks/useDrive';

import { DEFAULT_FOLDER_COLOR } from '../constants/folderColors';

import { formatBytes, formatDate } from '../utils/format';

import {
  ConfirmDeleteDialog,
  MoveDialog,
  NameDialog,
} from './Dialogs';

import FileIcon from './FileIcon';

interface Props {
  folders: FolderResponse[];
  files: FileResponse[];
  emptyText: string;
}

type ActionType = 'rename' | 'move' | 'delete';

type ActiveAction = {
  type: ActionType;
  item: DriveItem;
};

type MenuState = {
  anchor: HTMLElement;
  item: DriveItem;
};

const HOVER_BG = '#f3f2f1';
const HEADER_BG = '#faf9f8';

const nameOf = (item: DriveItem) =>
  item.kind === 'folder'
    ? item.data.name
    : item.data.fileName;

const headerCellSx = {
  bgcolor: HEADER_BG,
  color: 'text.secondary',
  fontSize: 14.5,
  fontWeight: 800,
  py: 2,
} as const;

const hideOnMobile = {
  display: { xs: 'none', sm: 'table-cell' },
} as const;

/* -------------------------------------------------------------------------- */
/* Empty State                                                                */
/* -------------------------------------------------------------------------- */

function EmptyState({
  text,
}: Readonly<{ text: string }>) {
  return (
    <Box
      sx={{
        textAlign: 'center',
        py: 10,
        color: 'text.secondary',
      }}
    >
      <MdFolderOpen size={56} color="#c8c6c4" />

      <Typography sx={{ mt: 1.5 }}>
        {text}
      </Typography>
    </Box>
  );
}

/* -------------------------------------------------------------------------- */
/* Table Row                                                                  */
/* -------------------------------------------------------------------------- */

interface RowProps {
  item: DriveItem;
  menuOpen: boolean;
  onOpenMenu: (
    event: MouseEvent<HTMLElement>,
    item: DriveItem,
  ) => void;
}

function ItemRow({
  item,
  menuOpen,
  onOpenMenu,
}: Readonly<RowProps>) {
  const navigate = useNavigate();

  const isFolder = item.kind === 'folder';

  const secondary = isFolder
    ? formatDate(item.data.updatedAt)
    : `${formatDate(item.data.updatedAt)} · ${formatBytes(item.data.fileSize)}`;

  return (
    <TableRow
      hover
      selected={menuOpen}
      onClick={
        isFolder
          ? () => navigate(`/folder/${item.data.id}`)
          : undefined
      }
      sx={{
        height: 52,
        cursor: isFolder ? 'pointer' : 'default',

        '&:last-child td': {
          borderBottom: 0,
        },

        '&.MuiTableRow-hover:hover, &.Mui-selected': {
          bgcolor: HOVER_BG,
        },

        '&.Mui-selected:hover': {
          bgcolor: HOVER_BG,
        },

        '@media (hover: hover)': {
          '& .row-actions': {
            opacity: menuOpen ? 1 : 0,
          },

          '&:hover .row-actions, & .row-actions:focus-visible': {
            opacity: 1,
          },
        },
      }}
    >
      {/* Name */}
      <TableCell sx={{ maxWidth: 0 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            minWidth: 0,
          }}
        >
          <FileIcon
            kind={item.kind}
            fileName={item.kind === 'file' ? item.data.fileName : undefined}
            contentType={item.kind === 'file' ? item.data.contentType : null}
            color={
              item.kind === 'folder'
                ? item.data.color ?? DEFAULT_FOLDER_COLOR
                : undefined
            }
            size={26}
          />

          <Box sx={{ minWidth: 0 }}>
            {isFolder ? (
              <Link
                component={RouterLink}
                to={`/folder/${item.data.id}`}
                onClick={(event) => event.stopPropagation()}
                underline="hover"
                color="text.primary"
                noWrap
                sx={{
                  display: 'block',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {item.data.name}
              </Link>
            ) : (
              <Link
                href={filesApi.downloadUrl(item.data.id)}
                underline="hover"
                color="text.primary"
                noWrap
                sx={{
                  display: 'block',
                  fontSize: 14,
                }}
              >
                {item.data.fileName}
              </Link>
            )}

            {/* Mobile metadata */}
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              sx={{
                display: {
                  xs: 'block',
                  sm: 'none',
                },
              }}
            >
              {secondary}
            </Typography>
          </Box>
        </Box>
      </TableCell>

      {/* Modified */}
      <TableCell
        sx={{
          ...hideOnMobile,
          color: 'text.secondary',
          fontSize: 13.5,
          whiteSpace: 'nowrap',
        }}
      >
        {formatDate(item.data.updatedAt)}
      </TableCell>

      {/* Size */}
      <TableCell
        align="right"
        sx={{
          ...hideOnMobile,
          color: 'text.secondary',
          fontSize: 13.5,
          whiteSpace: 'nowrap',
        }}
      >
        {item.kind === 'file'
          ? formatBytes(item.data.fileSize)
          : '—'}
      </TableCell>

      {/* Actions */}
      <TableCell
        align="right"
        sx={{ pr: 1.5 }}
      >
        <IconButton
          className="row-actions"
          size="small"
          aria-label={`More actions for ${nameOf(item)}`}
          aria-haspopup="menu"
          onClick={(event) => {
            event.stopPropagation();
            onOpenMenu(event, item);
          }}
        >
          <MdMoreVert />
        </IconButton>
      </TableCell>
    </TableRow>
  );
}

/* -------------------------------------------------------------------------- */
/* Item Action Menu                                                           */
/* -------------------------------------------------------------------------- */

interface MenuProps {
  menu: MenuState | null;
  onClose: () => void;
  onAction: (type: ActionType) => void;
  onCopy: (fileId: string) => void;
}

function ItemMenu({
  menu,
  onClose,
  onAction,
  onCopy,
}: Readonly<MenuProps>) {
  const item = menu?.item;

  return (
    <Menu
      anchorEl={menu?.anchor}
      open={menu !== null}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      slotProps={{
        paper: {
          sx: {
            minWidth: 200,
            borderRadius: 2,
            mt: 0.5,
            boxShadow: 6,
          },
        },
        list: {
          dense: true,
        },
      }}
    >
      {/* Download */}
      {item?.kind === 'file' && (
        <MenuItem
          component="a"
          href={filesApi.downloadUrl(item.data.id)}
          onClick={onClose}
        >
          <ListItemIcon>
            <MdDownload size={20} />
          </ListItemIcon>

          <ListItemText>
            Download
          </ListItemText>
        </MenuItem>
      )}

      {/* Rename */}
      <MenuItem
        onClick={() => onAction('rename')}
      >
        <ListItemIcon>
          <MdDriveFileRenameOutline size={20} />
        </ListItemIcon>

        <ListItemText>
          Rename
        </ListItemText>
      </MenuItem>

      {/* Move */}
      <MenuItem
        onClick={() => onAction('move')}
      >
        <ListItemIcon>
          <MdDriveFileMove size={20} />
        </ListItemIcon>

        <ListItemText>
          Move to
        </ListItemText>
      </MenuItem>

      {/* Copy */}
      {item?.kind === 'file' && (
        <MenuItem
          onClick={() => {
            onCopy(item.data.id);
            onClose();
          }}
        >
          <ListItemIcon>
            <MdContentCopy size={20} />
          </ListItemIcon>

          <ListItemText>
            Make a copy
          </ListItemText>
        </MenuItem>
      )}

      <Divider sx={{ my: 0.5 }} />

      {/* Delete */}
      <MenuItem
        onClick={() => onAction('delete')}
        sx={{ color: 'error.main' }}
      >
        <ListItemIcon sx={{ color: 'inherit' }}>
          <MdDelete size={20} />
        </ListItemIcon>

        <ListItemText>
          Delete
        </ListItemText>
      </MenuItem>
    </Menu>
  );
}

/* -------------------------------------------------------------------------- */
/* Item Table                                                                 */
/* -------------------------------------------------------------------------- */

export default function ItemTable({
  folders,
  files,
  emptyText,
}: Readonly<Props>) {
  const {
    rename,
    move,
    copyFile,
    remove,
  } = useDriveMutations();

  const [menu, setMenu] = useState<MenuState | null>(null);

  const [action, setAction] = useState<ActiveAction | null>(null);

  const items: DriveItem[] = [
    ...folders.map(
      (data): DriveItem => ({
        kind: 'folder',
        data,
      }),
    ),

    ...files.map(
      (data): DriveItem => ({
        kind: 'file',
        data,
      }),
    ),
  ];

  /* ---------------------------------------------------------------------- */
  /* Menu Handlers                                                          */
  /* ---------------------------------------------------------------------- */

  const openMenu = (
    event: MouseEvent<HTMLElement>,
    item: DriveItem,
  ) => {
    setMenu({
      anchor: event.currentTarget,
      item,
    });
  };

  const closeMenu = () => {
    setMenu(null);
  };

  const startAction = (type: ActionType) => {
    if (menu) {
      setAction({
        type,
        item: menu.item,
      });
    }

    closeMenu();
  };

  /* ---------------------------------------------------------------------- */
  /* Rename Handler                                                         */
  /* ---------------------------------------------------------------------- */

  const handleRename = (
    name: string,
    color?: string,
  ) => {
    if (!action || action.type !== 'rename') {
      return Promise.resolve();
    }

    return rename.mutateAsync({
      item: action.item,
      name,
      color:
        action.item.kind === 'folder'
          ? color
          : undefined,
    });
  };

  /* ---------------------------------------------------------------------- */
  /* Empty State                                                            */
  /* ---------------------------------------------------------------------- */

  if (items.length === 0) {
    return <EmptyState text={emptyText} />;
  }

  const menuItemId = menu?.item.data.id;

  /* ---------------------------------------------------------------------- */
  /* Render                                                                 */
  /* ---------------------------------------------------------------------- */

  return (
    <>
      {/* Files and folders table */}
      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{
          borderRadius: 0,
          overflow: 'hidden',
          borderColor: 'divider',
        }}
      >
        <Table aria-label="Files and folders">
          <TableHead>
            <TableRow>
              <TableCell sx={headerCellSx}>
                Name
              </TableCell>

              <TableCell
                sx={{
                  ...headerCellSx,
                  ...hideOnMobile,
                  width: 210,
                }}
              >
                Modified
              </TableCell>

              <TableCell
                align="right"
                sx={{
                  ...headerCellSx,
                  ...hideOnMobile,
                  width: 110,
                }}
              >
                Size
              </TableCell>

              <TableCell
                sx={{
                  ...headerCellSx,
                  width: 56,
                }}
              />
            </TableRow>
          </TableHead>

          <TableBody>
            {items.map((item) => (

              <ItemRow
                key={`${item.kind}-${item.data.id}`}
                item={item}
                menuOpen={
                  menuItemId === item.data.id
                }
                onOpenMenu={openMenu}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Action menu */}
      <ItemMenu
        menu={menu}
        onClose={closeMenu}
        onAction={startAction}
        onCopy={(fileId) =>
          copyFile.mutate(fileId)
        }
      />

      {/* Rename dialog */}
      {action?.type === 'rename' && (
        <NameDialog
          title={
            action.item.kind === 'folder'
              ? 'Rename folder'
              : 'Rename file'
          }
          label={
            action.item.kind === 'folder'
              ? 'Folder name'
              : 'File name'
          }
          confirmLabel="Save changes"
          initialValue={nameOf(action.item)}
          initialColor={
            action.item.kind === 'folder'
              ? action.item.data.color ?? DEFAULT_FOLDER_COLOR
              : DEFAULT_FOLDER_COLOR
          }
          showFolderColor={
            action.item.kind === 'folder'
          }
          onSubmit={handleRename}
          onClose={() => setAction(null)}
        />
      )}

      {/* Move dialog */}
      {action?.type === 'move' && (
        <MoveDialog
          item={action.item}
          onMove={(targetId) =>
            move.mutateAsync({
              item: action.item,
              targetId,
            })
          }
          onClose={() => setAction(null)}
        />
      )}

      {/* Delete dialog */}
      {action?.type === 'delete' && (
        <ConfirmDeleteDialog
          item={action.item}
          onConfirm={() =>
            remove.mutateAsync(action.item)
          }
          onClose={() => setAction(null)}
        />
      )}
    </>
  );
}