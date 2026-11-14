import { useState, type MouseEvent } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
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
  MdMoreVert,
} from 'react-icons/md';
import { filesApi } from '../api/driveApi';
import type { DriveItem, FileResponse, FolderResponse } from '../api/types';
import { useDriveMutations } from '../hooks/useDrive';
import { formatBytes, formatDate } from '../utils/format';
import { ConfirmDeleteDialog, MoveDialog, NameDialog } from './Dialogs';
import FileIcon from './FileIcon';

interface Props {
  folders: FolderResponse[];
  files: FileResponse[];
  emptyText: string;
}

type Action = { type: 'rename' | 'move' | 'delete'; item: DriveItem };

/** Lists folders then files with a per-row action menu. Owns the rename/move/delete dialogs. */
export default function ItemTable({ folders, files, emptyText }: Props) {
  const { rename, move, copyFile, remove } = useDriveMutations();
  const [menu, setMenu] = useState<{ anchor: HTMLElement; item: DriveItem } | null>(null);
  const [action, setAction] = useState<Action | null>(null);

  const items: DriveItem[] = [
    ...folders.map((data): DriveItem => ({ kind: 'folder', data })),
    ...files.map((data): DriveItem => ({ kind: 'file', data })),
  ];

  const openMenu = (event: MouseEvent<HTMLElement>, item: DriveItem) =>
    setMenu({ anchor: event.currentTarget, item });
  const closeMenu = () => setMenu(null);

  const startAction = (type: Action['type']) => {
    if (menu) setAction({ type, item: menu.item });
    closeMenu();
  };

  if (items.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ mt: 6, textAlign: 'center' }}>
        {emptyText}
      </Typography>
    );
  }

  return (
    <>
      <TableContainer component={Paper} variant="outlined">
        <Table size="medium">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Modified</TableCell>
              <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                Size
              </TableCell>
              <TableCell width={56} />
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={`${item.kind}-${item.data.id}`} hover>
                <TableCell>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
                    <FileIcon
                      kind={item.kind}
                      contentType={item.kind === 'file' ? item.data.contentType : null}
                    />
                    {item.kind === 'folder' ? (
                      <Link component={RouterLink} to={`/folder/${item.data.id}`} underline="hover" color="inherit">
                        {item.data.name}
                      </Link>
                    ) : (
                      <Link href={filesApi.downloadUrl(item.data.id)} underline="hover" color="inherit">
                        {item.data.fileName}
                      </Link>
                    )}
                  </span>
                </TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                  {formatDate(item.data.updatedAt)}
                </TableCell>
                <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                  {item.kind === 'file' ? formatBytes(item.data.fileSize) : '—'}
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={(e) => openMenu(e, item)} aria-label="More actions">
                    <MdMoreVert />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu anchorEl={menu?.anchor} open={menu !== null} onClose={closeMenu}>
        {menu?.item.kind === 'file' && (
          <MenuItem component="a" href={filesApi.downloadUrl(menu.item.data.id)} onClick={closeMenu}>
            <ListItemIcon>
              <MdDownload size={20} />
            </ListItemIcon>
            <ListItemText>Download</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={() => startAction('rename')}>
          <ListItemIcon>
            <MdDriveFileRenameOutline size={20} />
          </ListItemIcon>
          <ListItemText>Rename</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => startAction('move')}>
          <ListItemIcon>
            <MdDriveFileMove size={20} />
          </ListItemIcon>
          <ListItemText>Move</ListItemText>
        </MenuItem>
        {menu?.item.kind === 'file' && (
          <MenuItem
            onClick={() => {
              if (menu.item.kind === 'file') copyFile.mutate(menu.item.data.id);
              closeMenu();
            }}
          >
            <ListItemIcon>
              <MdContentCopy size={20} />
            </ListItemIcon>
            <ListItemText>Make a copy</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={() => startAction('delete')} sx={{ color: 'error.main' }}>
          <ListItemIcon sx={{ color: 'inherit' }}>
            <MdDelete size={20} />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {action?.type === 'rename' && (
        <NameDialog
          title="Rename"
          label="Name"
          confirmLabel="Rename"
          initialValue={action.item.kind === 'folder' ? action.item.data.name : action.item.data.fileName}
          onSubmit={(name) => rename.mutateAsync({ item: action.item, name })}
          onClose={() => setAction(null)}
        />
      )}
      {action?.type === 'move' && (
        <MoveDialog
          item={action.item}
          onMove={(targetId) => move.mutateAsync({ item: action.item, targetId })}
          onClose={() => setAction(null)}
        />
      )}
      {action?.type === 'delete' && (
        <ConfirmDeleteDialog
          item={action.item}
          onConfirm={() => remove.mutateAsync(action.item)}
          onClose={() => setAction(null)}
        />
      )}
    </>
  );
}
