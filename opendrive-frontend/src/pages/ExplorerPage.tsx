import { useState } from 'react';

import {
  Link as RouterLink,
  useParams,
} from 'react-router-dom';

import { useDropzone } from 'react-dropzone';

import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Link,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';

import { alpha } from '@mui/material/styles';

import {
  MdChevronRight,
  MdCloudUpload,
} from 'react-icons/md';

import ExplorerActions from '../components/ExplorerActions';
import ItemTable from '../components/ItemTable';
import { NameDialog } from '../components/Dialogs';

import { errorMessage } from '../api/client';

import type { FolderResponse } from '../api/types';

import {
  useContents,
  useDriveMutations,
  useUploader,
} from '../hooks/useDrive';

// --------------------------------------------------
// Breadcrumb styles
// --------------------------------------------------

const crumbSx = {
  fontSize: 20,
  fontWeight: 600,
  lineHeight: 1.3,
} as const;

// --------------------------------------------------
// Folder breadcrumbs
// --------------------------------------------------

function PathBreadcrumbs({
  crumbs,
}: Readonly<{ crumbs: FolderResponse[] }>) {
  return (
    <Breadcrumbs
      maxItems={4}
      aria-label="Folder path"
      separator={<MdChevronRight size={20} />}
      sx={{
        minWidth: 0,
        '& .MuiBreadcrumbs-separator': {
          mx: 0.5,
          color: 'text.secondary',
        },
      }}
    >
      {[
        crumbs.length > 0 ? (
          <Link
            key="root"
            component={RouterLink}
            to="/"
            underline="hover"
            color="text.secondary"
            sx={crumbSx}
          >
            My files
          </Link>
        ) : (
          <Typography
            key="root"
            color="text.primary"
            sx={crumbSx}
          >
            My files
          </Typography>
        ),

        ...crumbs.map((crumb, index) =>
          index === crumbs.length - 1 ? (
            <Typography
              key={crumb.id}
              color="text.primary"
              noWrap
              sx={crumbSx}
            >
              {crumb.name}
            </Typography>
          ) : (
            <Link
              key={crumb.id}
              component={RouterLink}
              to={`/folder/${crumb.id}`}
              underline="hover"
              color="text.secondary"
              noWrap
              sx={crumbSx}
            >
              {crumb.name}
            </Link>
          ),
        ),
      ]}
    </Breadcrumbs>
  );
}

// --------------------------------------------------
// Loading skeleton
// --------------------------------------------------

function ListSkeleton() {
  return (
    <Stack
      spacing={0.5}
      aria-busy="true"
      aria-label="Loading files"
    >
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton
          key={index}
          variant="rounded"
          height={52}
        />
      ))}
    </Stack>
  );
}

// --------------------------------------------------
// File drop overlay
// --------------------------------------------------

function DropOverlay() {
  return (
    <Box
      sx={(theme) => ({
        position: 'absolute',
        inset: 0,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        border: 2,
        borderStyle: 'dashed',
        borderColor: 'primary.main',
        borderRadius: 2,
        bgcolor: alpha(theme.palette.primary.main, 0.08),
        color: 'primary.main',
        backdropFilter: 'blur(1px)',
        pointerEvents: 'none',
      })}
    >
      <MdCloudUpload size={48} />

      <Typography variant="h6">
        Drop files to upload
      </Typography>

      <Typography
        variant="body2"
        color="text.secondary"
      >
        Release to start uploading
      </Typography>
    </Box>
  );
}

// --------------------------------------------------
// Explorer page
// --------------------------------------------------

export default function ExplorerPage() {
  const { folderId } = useParams();

  // Folder and file contents
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useContents(folderId);

  // Drive mutations
  const { createFolder } = useDriveMutations();

  // File uploader
  const upload = useUploader(folderId);

  // Dialog state
  const [newFolderOpen, setNewFolderOpen] = useState(false);

  // ------------------------------------------------
  // Drag and drop configuration
  // ------------------------------------------------

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    open,
  } = useDropzone({
    onDrop: (files) => {
      if (files.length > 0) {
        void upload(files);
      }
    },
    noClick: true,
    noKeyboard: true,
  });

  // ------------------------------------------------
  // Create folder
  // ------------------------------------------------

  const handleCreateFolder = async (
    name: string,
    color?: string,
  ) => {
    await createFolder.mutateAsync({
      name,
      parentId: folderId,
      color,
    });
  };

  // ------------------------------------------------
  // Render
  // ------------------------------------------------

  return (
    <Box
      {...getRootProps()}
      sx={{
        minHeight: 'calc(100vh - 120px)',
        position: 'relative',
        outline: 'none',
      }}
    >
      {/* Hidden file input */}
      <input {...getInputProps()} />

      {/* ------------------------------------------ */}
      {/* Explorer toolbar */}
      {/* ------------------------------------------ */}

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={2}
        sx={{
          mb: 2.5,
          minHeight: 40,
        }}
      >
        <PathBreadcrumbs
          crumbs={data?.breadcrumbs ?? []}
        />

        <ExplorerActions
          onNewFolder={() => setNewFolderOpen(true)}
          onUpload={open}
        />
      </Stack>

      {/* ------------------------------------------ */}
      {/* Loading state */}
      {/* ------------------------------------------ */}

      {isLoading && <ListSkeleton />}

      {/* ------------------------------------------ */}
      {/* Error state */}
      {/* ------------------------------------------ */}

      {error && (
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
          sx={{ mb: 2 }}
        >
          {errorMessage(error)}
        </Alert>
      )}

      {/* ------------------------------------------ */}
      {/* Folder and file listing */}
      {/* ------------------------------------------ */}

      {data && (
        <ItemTable
          folders={data.folders}
          files={data.files}
          emptyText="This folder is empty. Drag files here or use Upload."
        />
      )}

      {/* ------------------------------------------ */}
      {/* Drag overlay */}
      {/* ------------------------------------------ */}

      {isDragActive && <DropOverlay />}

      {/* ------------------------------------------ */}
      {/* New folder dialog */}
      {/* ------------------------------------------ */}

      {newFolderOpen && (
        <NameDialog
          title="Create new folder"
          label="Folder name"
          confirmLabel="Create folder"
          showFolderColor
          onSubmit={(name, color) =>
            createFolder.mutateAsync({
              name,
              parentId: folderId,
              color,
            })
          }
          onClose={() => setNewFolderOpen(false)}
        />
      )}


    </Box>
  );
}