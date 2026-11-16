import {
    Alert,
    AppBar,
    Box,
    CircularProgress,
    Dialog,
    IconButton,
    Toolbar,
    Tooltip,
    Typography,
} from '@mui/material';

import { MdClose, MdDownload, MdOpenInNew } from 'react-icons/md';

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

const actionButtonSx = {
    color: '#ffffff',
    '&:hover': {
        bgcolor: 'rgba(255, 255, 255, 0.12)',
    },
    '&.Mui-disabled': {
        color: 'rgba(255, 255, 255, 0.35)',
    },
};

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
            window.open(previewUrl, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <Dialog
            fullScreen
            open
            onClose={onClose}
            aria-label={`Preview of ${file.fileName}`}
            slotProps={{
                paper: {
                    sx: {
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        bgcolor: 'rgba(0, 0, 0, 0.85)',
                        backgroundImage: 'none',
                    },
                },
            }}
        >
            {/* Toolbar */}
            <AppBar
                position="relative"
                elevation={0}
                sx={{
                    flexShrink: 0,
                    bgcolor: 'rgba(15, 15, 15, 0.95)',
                    color: '#ffffff',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
                }}
            >
                <Toolbar
                    disableGutters
                    sx={{
                        minHeight: '52px !important',
                        height: 52,
                        px: 2,
                        gap: 1,
                    }}
                >
                    <Typography
                        fontSize={14}
                        fontWeight={600}
                        noWrap
                        sx={{ flex: 1, minWidth: 0, color: '#ffffff' }}
                    >
                        {file.fileName}
                    </Typography>

                    <Tooltip title="Open in new tab">
                        <span>
                            <IconButton
                                size="small"
                                onClick={openInNewTab}
                                disabled={!previewUrl}
                                aria-label="Open in new tab"
                                sx={actionButtonSx}
                            >
                                <MdOpenInNew size={20} />
                            </IconButton>
                        </span>
                    </Tooltip>

                    <Tooltip title="Download">
                        <IconButton
                            size="small"
                            component="a"
                            href={filesApi.downloadUrl(file.id)}
                            download={file.fileName}
                            aria-label="Download file"
                            sx={actionButtonSx}
                        >
                            <MdDownload size={20} />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Close preview">
                        <IconButton
                            size="small"
                            onClick={onClose}
                            aria-label="Close preview"
                            sx={{
                                ...actionButtonSx,
                                '&:hover': {
                                    bgcolor: 'rgba(255, 70, 70, 0.18)',
                                    color: '#ff6b6b',
                                },
                            }}
                        >
                            <MdClose size={21} />
                        </IconButton>
                    </Tooltip>
                </Toolbar>
            </AppBar>

            {/* Content */}
            <Box
                sx={{
                    position: 'relative', // anchors absolutely positioned previews
                    flex: 1,
                    minHeight: 0,
                    width: '100%',
                    overflow: 'hidden',
                }}
            >
                {loading && (
                    <Box
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: 2,
                        }}
                    >
                        <CircularProgress size={32} sx={{ color: '#ffffff' }} />
                        <Typography
                            fontSize={13}
                            sx={{ color: 'rgba(255,255,255,0.7)' }}
                        >
                            Loading preview...
                        </Typography>
                    </Box>
                )}

                {!loading && error && (
                    <Box sx={{ p: 3 }}>
                        <Alert severity="error">{error}</Alert>
                    </Box>
                )}

                {!loading && !error && previewUrl && (
                    <FilePreviewContent
                        key={file.id}
                        file={file}
                        src={previewUrl}
                    />
                )}
            </Box>
        </Dialog>
    );
}