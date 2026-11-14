import {
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent as ReactDragEvent,
} from 'react';

import {
  Link as RouterLink,
  useParams,
} from 'react-router-dom';

import type { DropEvent } from 'react-dropzone';

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

import { filesApi } from '../api/driveApi';

import {
  MdChevronRight,
  MdCloudUpload,
} from 'react-icons/md';

import ExplorerActions from '../components/ExplorerActions';
import ItemTable from '../components/ItemTable';

import {
  NameDialog,
  FolderUploadConfirmDialog,
} from '../components/Dialogs';

import { errorMessage } from '../api/client';

import type { FolderResponse } from '../api/types';

import {
  useContents,
  useDriveMutations,
  useUploader,
} from '../hooks/useDrive';

// --------------------------------------------------
// Drag and drop directory helpers
// --------------------------------------------------

/**
 * Read a dropped file and attach its relative path.
 */
function readFileEntry(
  entry: FileSystemFileEntry,
  parentPath: string,
): Promise<File> {

  return new Promise((resolve, reject) => {
    entry.file(
      (file) => {
        const relativePath = [
          parentPath,
          entry.name,
        ].filter(Boolean).join('/');

        Object.defineProperty(file, 'webkitRelativePath', {
          value: relativePath,
          configurable: true,
        });

        resolve(file);
      },
      reject,
    );
  });
}

/**
 * Read all entries from a directory.
 *
 * Chrome can return directory entries in batches,
 * so continue reading until an empty batch is returned.
 */
function readDirectoryEntries(
  directoryReader: FileSystemDirectoryReader,
): Promise<FileSystemEntry[]> {

  return new Promise((resolve, reject) => {

    const entries: FileSystemEntry[] = [];

    const readNextBatch = () => {

      directoryReader.readEntries(
        (batch) => {

          if (batch.length === 0) {
            resolve(entries);
            return;
          }

          entries.push(...batch);

          readNextBatch();
        },
        reject,
      );
    };

    readNextBatch();
  });
}

/**
 * Recursively traverse files and directories.
 */
async function readDroppedEntry(
  entry: FileSystemEntry,
  parentPath = '',
): Promise<File[]> {

  const currentPath = [
    parentPath,
    entry.name,
  ].filter(Boolean).join('/');

  // File entry
  if (entry.isFile) {
    return readFileEntry(
      entry as FileSystemFileEntry,
      parentPath,
    ).then((file) => [file]);
  }

  // Directory entry
  if (entry.isDirectory) {

    const directoryEntry = entry as FileSystemDirectoryEntry;

    const reader = directoryEntry.createReader();

    const children = await readDirectoryEntries(reader);

    const nestedFiles = await Promise.all(
      children.map((child) =>
        readDroppedEntry(child, currentPath),
      ),
    );

    return nestedFiles.flat();
  }

  return [];
}

/**
 * Check whether the drag operation contains directories.
 * If directories exist, recursively collect all files.
 */
async function getDroppedDirectoryFiles(
  entries: FileSystemEntry[],
): Promise<{
  containsDirectory: boolean;
  files: File[];
}> {
  const containsDirectory = entries.some(
    (entry) => entry.isDirectory,
  );

  if (!containsDirectory) {
    return {
      containsDirectory: false,
      files: [],
    };
  }

  const results = await Promise.all(
    entries.map((entry) => readDroppedEntry(entry)),
  );

  return {
    containsDirectory: true,
    files: results.flat(),
  };
}

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
        Drop files or folders to upload
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

  // Normal file uploader
  const upload = useUploader(folderId);

  // Dialog state
  const [newFolderOpen, setNewFolderOpen] = useState(false);

  // Folder input reference
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Folder upload state
  const [folderUploading, setFolderUploading] = useState(false);
  const [folderUploadError, setFolderUploadError] = useState('');

  // Folder confirmation state
  const [folderConfirmOpen, setFolderConfirmOpen] = useState(false);

  const [selectedFolderFiles, setSelectedFolderFiles] =
    useState<File[]>([]);

  const [selectedFolderName, setSelectedFolderName] =
    useState('');

  const droppedEntriesRef = useRef<FileSystemEntry[]>([]);

  // ------------------------------------------------
  // Prepare folder upload confirmation
  // ------------------------------------------------

  const prepareFolderUpload = (files: File[]) => {

    if (files.length === 0) {
      return;
    }

    const firstPath = (
      files[0] as File & {
        webkitRelativePath?: string;
      }
    ).webkitRelativePath;

    const rootFolders = new Set(
      files.map((file) => {
        const relativePath = (
          file as File & {
            webkitRelativePath?: string;
          }
        ).webkitRelativePath;

        return relativePath
          ? relativePath.split('/')[0]
          : file.name;
      }),
    );

    const folderName =
      rootFolders.size === 1
        ? (firstPath?.split('/')[0] ?? 'Selected folder')
        : `${rootFolders.size} dropped items`;

    setSelectedFolderFiles(files);
    setSelectedFolderName(folderName);
    setFolderUploadError('');
    setFolderConfirmOpen(true);
  };

  const handleDropCapture = (
  event: ReactDragEvent<HTMLDivElement>,
) => {
  const items = Array.from(event.dataTransfer.items);

  droppedEntriesRef.current = items
    .map((item) => {
      const webkitItem = item as DataTransferItem & {
        webkitGetAsEntry?: () => FileSystemEntry | null;
      };

      return webkitItem.webkitGetAsEntry?.() ?? null;
    })
    .filter(
      (entry): entry is FileSystemEntry => entry !== null,
    );

  console.log(
    'Captured dropped entries:',
    droppedEntriesRef.current.map((entry) => ({
      name: entry.name,
      isFile: entry.isFile,
      isDirectory: entry.isDirectory,
    })),
  );
};

  // ------------------------------------------------
  // Drag and drop handler
  // ------------------------------------------------

 const handleDrop = async (
  acceptedFiles: File[],
  _event: DropEvent,
) => {
  try {
    // Use entries captured synchronously during drop.
    const entries = droppedEntriesRef.current;

    // Clear the ref for the next drop operation.
    droppedEntriesRef.current = [];

    console.log('Accepted files:', acceptedFiles);
    console.log('Captured entries:', entries);

    const directoryResult =
      await getDroppedDirectoryFiles(entries);

    if (directoryResult.containsDirectory) {
      console.log(
        'Directory detected:',
        directoryResult.files,
      );

      prepareFolderUpload(directoryResult.files);
      return;
    }

    // Normal file upload.
    if (acceptedFiles.length > 0) {
      void upload(acceptedFiles);
    }
  } catch (error) {
    console.error('Drag and drop failed:', error);
    setFolderUploadError(errorMessage(error));
  }
};

  // ------------------------------------------------
  // Drag and drop configuration
  // ------------------------------------------------

const {
  getRootProps,
  getInputProps,
  isDragActive,
  open,
} = useDropzone({
  onDrop: (acceptedFiles, _fileRejections, event) => {
    void handleDrop(acceptedFiles, event);
  },
  noClick: true,
  noKeyboard: true,
});

  // ------------------------------------------------
  // Upload folder - open picker
  // ------------------------------------------------

  const handleUploadFolder = () => {
    folderInputRef.current?.click();
  };

  // ------------------------------------------------
  // Upload folder - selection
  // ------------------------------------------------

  const handleFolderSelect = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {

    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) {
      return;
    }

    prepareFolderUpload(files);

    // Allow selecting the same folder again.
    event.target.value = '';
  };

  // ------------------------------------------------
  // Upload folder - confirmation
  // ------------------------------------------------

  const handleConfirmFolderUpload = async () => {

    try {

      setFolderUploading(true);
      setFolderUploadError('');

      const response = await filesApi.uploadFolder(
        selectedFolderFiles,
        folderId,
      );

      console.log('Folder upload completed:', response);

      // Refresh current folder contents.
      await refetch();

      setSelectedFolderFiles([]);
      setSelectedFolderName('');

    } catch (error) {

      console.error('Folder upload failed:', error);

      setFolderUploadError(errorMessage(error));

      throw error;

    } finally {

      setFolderUploading(false);
    }
  };

  // ------------------------------------------------
  // Render
  // ------------------------------------------------

  return (
    <Box
      {...getRootProps({
        onDropCapture: handleDropCapture,
      })}
      sx={{
        minHeight: 'calc(100vh - 120px)',
        position: 'relative',
        outline: 'none',
      }}
    >

      {/* Hidden file input */}
      <input {...getInputProps()} />

      {/* Hidden folder input */}
      <input
        ref={folderInputRef}
        type="file"
        multiple
        onChange={handleFolderSelect}
        style={{ display: 'none' }}
        {...({
          webkitdirectory: '',
          directory: '',
        } as object)}
      />

      {/* Explorer toolbar */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={2}
        sx={{
          my: 1,
        }}
      >
        <PathBreadcrumbs
          crumbs={data?.breadcrumbs ?? []}
        />

        <ExplorerActions
          onNewFolder={() => setNewFolderOpen(true)}
          onUpload={open}
          onUploadFolder={handleUploadFolder}
        />
      </Stack>

      {/* Folder upload status */}
      {folderUploading && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Uploading folder and preserving directory structure...
        </Alert>
      )}

      {folderUploadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {folderUploadError}
        </Alert>
      )}

      {/* Loading state */}
      {isLoading && <ListSkeleton />}

      {/* Error state */}
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

      {/* Folder and file listing */}
      {data && (
        <ItemTable
          folders={data.folders}
          files={data.files}
          emptyText="This folder is empty. Drag files or folder here or use New."
        />
      )}

      {/* Drag overlay */}
      {isDragActive && <DropOverlay />}

      {/* New folder dialog */}
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

      {/* Folder upload confirmation dialog */}
      {folderConfirmOpen && (
        <FolderUploadConfirmDialog
          folderName={selectedFolderName}
          files={selectedFolderFiles}
          onConfirm={handleConfirmFolderUpload}
          onClose={() => {
            setFolderConfirmOpen(false);
            setSelectedFolderFiles([]);
            setSelectedFolderName('');
          }}
        />
      )}

    </Box>
  );
}