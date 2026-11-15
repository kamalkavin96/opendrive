import {
    Alert,
    AppBar,
    Box,
    CircularProgress,
    IconButton,
    Toolbar,
    Tooltip,
    Typography,
} from '@mui/material';

import {
    MdClose,
    MdDownload,
    MdOpenInNew,
} from 'react-icons/md';

import type { FileResponse } from '../../api/types';
import { filesApi } from '../../api/driveApi';

import FilePreviewContent from './FilePreviewContent';

interface Props {
    file: FileResponse | null;
    previewUrl: string | null;
    loading: boolean;
    error: string | null;
    onClose: () => void;
}

export default function FilePreviewDialog({
    file,
    previewUrl,
    loading,
    error,
    onClose,
}: Readonly<Props>) {

    if (!file) return null;

    const openInNewTab = () => {
        if (previewUrl) {
            window.open(
                previewUrl,
                '_blank',
                'noopener,noreferrer',
            );
        }
    };

    return (
        <Box
            sx={{
                position: 'fixed',
                inset: 0,
                zIndex: 1300,
                width: '100vw',
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                bgcolor: '#f3f4f6',
            }}
        >
            {/* Compact toolbar */}
            <AppBar
                position="relative"
                elevation={0}
                color="inherit"
                sx={{
                    flexShrink: 0,
                    bgcolor: '#fff',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <Toolbar
                    disableGutters
                    sx={{
                        minHeight: '48px !important',
                        height: 48,
                        px: 2,
                        gap: 1,
                    }}
                >
                    {/* File name */}
                    <Typography
                        fontSize={14}
                        fontWeight={600}
                        color="text.primary"
                        noWrap
                        sx={{
                            flex: 1,
                            minWidth: 0,
                        }}
                    >
                        {file.fileName}
                    </Typography>

                    {/* Open in new tab */}
                    <Tooltip title="Open in new tab">
                        <span>
                            <IconButton
                                size="small"
                                onClick={openInNewTab}
                                disabled={!previewUrl}
                                aria-label="Open in new tab"
                            >
                                <MdOpenInNew size={20} />
                            </IconButton>
                        </span>
                    </Tooltip>

                    {/* Download */}
                    <Tooltip title="Download">
  <IconButton
    size="small"
    onClick={() => filesApi.download(file.id)}
    aria-label="Download file"
  >
    <MdDownload size={20} />
  </IconButton>
</Tooltip>

                    {/* Close */}
                    <Tooltip title="Close preview">
                        <IconButton
                            size="small"
                            onClick={onClose}
                            aria-label="Close preview"
                        >
                            <MdClose size={21} />
                        </IconButton>
                    </Tooltip>
                </Toolbar>
            </AppBar>

            {/* Full-height preview area */}
            <Box
                sx={{
                    flex: 1,
                    minHeight: 0,
                    width: '100%',
                    // height: "100%",
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {/* Loading state */}
                {loading && (
                    <Box
                        sx={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: 2,
                        }}
                    >
                        <CircularProgress size={32} />

                        <Typography
                            color="text.secondary"
                            fontSize={13}
                        >
                            Loading preview...
                        </Typography>
                    </Box>
                )}

                {/* Error state */}
                {!loading && error && (
                    <Box sx={{ p: 3 }}>
                        <Alert severity="error">
                            {error}
                        </Alert>
                    </Box>
                )}

                {/* File content */}
                {!loading && !error && previewUrl && (
                    <Box
                        sx={{
                            flex: 1,
                            minHeight: 0,
                            width: '100%',
                            height: '100%',
                            overflow: 'hidden',
                        }}
                    >
                        <FilePreviewContent
                            file={file}
                            src={previewUrl}
                        />
                    </Box>
                    
                )}
            </Box>
        </Box>
    );
}