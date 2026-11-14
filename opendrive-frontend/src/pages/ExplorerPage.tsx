import { useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { Alert, Box, Breadcrumbs, Button, CircularProgress, Link, Stack, Typography } from '@mui/material';
import { MdCreateNewFolder, MdUploadFile } from 'react-icons/md';
import ItemTable from '../components/ItemTable';
import { NameDialog } from '../components/Dialogs';
import { errorMessage } from '../api/client';
import { useContents, useDriveMutations, useUploader } from '../hooks/useDrive';

export default function ExplorerPage() {
  const { folderId } = useParams();
  const { data, isLoading, error } = useContents(folderId);
  const { createFolder } = useDriveMutations();
  const upload = useUploader(folderId);
  const [newFolderOpen, setNewFolderOpen] = useState(false);

  // The whole page is a drop target; the Upload button opens the file picker.
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: (files) => void upload(files),
    noClick: true,
    noKeyboard: true,
  });

  return (
    <Box {...getRootProps()} sx={{ minHeight: 'calc(100vh - 120px)', position: 'relative' }}>
      <input {...getInputProps()} />

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }} spacing={2}>
        <Breadcrumbs>
          <Link component={RouterLink} to="/" underline="hover" color={folderId ? 'inherit' : 'text.primary'}>
            My files
          </Link>
          {(data?.breadcrumbs ?? []).map((crumb, index, all) =>
            index === all.length - 1 ? (
              <Typography key={crumb.id} color="text.primary">
                {crumb.name}
              </Typography>
            ) : (
              <Link key={crumb.id} component={RouterLink} to={`/folder/${crumb.id}`} underline="hover" color="inherit">
                {crumb.name}
              </Link>
            ),
          )}
        </Breadcrumbs>

        <Stack direction="row" spacing={1}>
          <Button startIcon={<MdCreateNewFolder />} onClick={() => setNewFolderOpen(true)}>
            New folder
          </Button>
          <Button variant="contained" startIcon={<MdUploadFile />} onClick={open}>
            Upload
          </Button>
        </Stack>
      </Stack>

      {isLoading && (
        <Box sx={{ textAlign: 'center', mt: 8 }}>
          <CircularProgress />
        </Box>
      )}
      {error && <Alert severity="error">{errorMessage(error)}</Alert>}
      {data && (
        <ItemTable
          folders={data.folders}
          files={data.files}
          emptyText="This folder is empty. Drag files here or use Upload."
        />
      )}

      {isDragActive && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            border: 3,
            borderStyle: 'dashed',
            borderColor: 'primary.main',
            borderRadius: 2,
            bgcolor: 'rgba(31, 111, 235, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <Typography variant="h6" color="primary">
            Drop files to upload
          </Typography>
        </Box>
      )}

      {newFolderOpen && (
        <NameDialog
          title="New folder"
          label="Folder name"
          confirmLabel="Create"
          onSubmit={(name) => createFolder.mutateAsync({ name, parentId: folderId })}
          onClose={() => setNewFolderOpen(false)}
        />
      )}
    </Box>
  );
}
