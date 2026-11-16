import { useMemo, useState } from 'react';

import Editor from '@monaco-editor/react';

import {
    Alert,
    Box,
    CircularProgress,
    IconButton,
    Tooltip,
    Typography,
} from '@mui/material';

import {
    MdWrapText,
    MdZoomIn,
    MdZoomOut,
} from 'react-icons/md';

import type { PreviewProps } from '../previewTypes';
import { useTextContent } from '../previews/useTextContent';

const FONT_SIZES = [11, 12, 13, 14, 16, 18, 20];

const LANGUAGE_MAP: Record<string, string> = {
    java: 'java',
    kt: 'kotlin',
    kts: 'kotlin',
    py: 'python',
    js: 'javascript',
    jsx: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'scss',
    less: 'less',
    json: 'json',
    xml: 'xml',
    yml: 'yaml',
    yaml: 'yaml',
    md: 'markdown',
    sql: 'sql',
    sh: 'shell',
    bash: 'shell',
    bat: 'bat',
    ps1: 'powershell',
    c: 'c',
    h: 'c',
    cpp: 'cpp',
    hpp: 'cpp',
    cs: 'csharp',
    go: 'go',
    rs: 'rust',
    php: 'php',
    rb: 'ruby',
    swift: 'swift',
    dart: 'dart',
    graphql: 'graphql',
    dockerfile: 'dockerfile',
    gradle: 'groovy',
};

const controlSx = {
    color: '#ffffff',
    '&:hover': {
        bgcolor: 'rgba(255,255,255,0.12)',
    },
    '&.Mui-disabled': {
        color: 'rgba(255,255,255,0.3)',
    },
};

export default function CodePreview({
    file,
    src,
}: Readonly<PreviewProps>) {
    const {
        loading,
        error,
        text,
        truncated,
    } = useTextContent(src);

    const [wrap, setWrap] = useState(false);
    const [fontIdx, setFontIdx] = useState(2);

    const extension = useMemo(
        () => file.fileName.split('.').pop()?.toLowerCase() ?? '',
        [file.fileName],
    );

    const language = LANGUAGE_MAP[extension] ?? 'plaintext';

    const fontSize = FONT_SIZES[fontIdx];

    if (loading) {
        return (
            <Box
                sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: '#1e1e1e',
                }}
            >
                <CircularProgress
                    size={28}
                    sx={{ color: '#ffffff' }}
                />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">{error}</Alert>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                bgcolor: '#1e1e1e',
            }}
        >
            {/* Code toolbar */}
            <Box
                sx={{
                    flexShrink: 0,
                    height: 40,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 1,
                    bgcolor: '#181818',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                }}
            >
                <Typography
                    fontSize={12}
                    sx={{
                        color: '#9cdcfe',
                        mr: 2,
                    }}
                >
                    {language}
                </Typography>

                <Tooltip title={wrap ? 'Disable word wrap' : 'Enable word wrap'}>
                    <IconButton
                        size="small"
                        onClick={() => setWrap((value) => !value)}
                        sx={{
                            ...controlSx,
                            color: wrap ? '#4fc3f7' : '#ffffff',
                        }}
                    >
                        <MdWrapText size={19} />
                    </IconButton>
                </Tooltip>

                <Tooltip title="Decrease font size">
                    <span>
                        <IconButton
                            size="small"
                            disabled={fontIdx === 0}
                            onClick={() =>
                                setFontIdx((index) => Math.max(0, index - 1))
                            }
                            sx={controlSx}
                        >
                            <MdZoomOut size={19} />
                        </IconButton>
                    </span>
                </Tooltip>

                <Typography
                    fontSize={11}
                    sx={{
                        color: '#ffffff',
                        minWidth: 22,
                        textAlign: 'center',
                    }}
                >
                    {fontSize}
                </Typography>

                <Tooltip title="Increase font size">
                    <span>
                        <IconButton
                            size="small"
                            disabled={fontIdx === FONT_SIZES.length - 1}
                            onClick={() =>
                                setFontIdx((index) =>
                                    Math.min(FONT_SIZES.length - 1, index + 1),
                                )
                            }
                            sx={controlSx}
                        >
                            <MdZoomIn size={19} />
                        </IconButton>
                    </span>
                </Tooltip>

                <Box sx={{ flex: 1 }} />

                <Typography
                    fontSize={11}
                    sx={{ color: '#888888', mr: 1 }}
                >
                    {text.split('\n').length} lines
                </Typography>

                {truncated && (
                    <Typography
                        fontSize={11}
                        sx={{ color: '#ffb74d' }}
                    >
                        Preview truncated
                    </Typography>
                )}
            </Box>

            {/* Monaco Editor */}
            <Box
                sx={{
                    flex: 1,
                    minHeight: 0,
                    width: '100%',
                    overflow: 'hidden',
                }}
            >
                <Editor
                    height="100%"
                    width="100%"
                    language={language}
                    value={text}
                    theme="vs-dark"
                    loading={
                        <CircularProgress
                            size={24}
                            sx={{ color: '#ffffff' }}
                        />
                    }
                    options={{
                        readOnly: true,
                        domReadOnly: true,
                        minimap: {
                            enabled: true,
                        },
                        lineNumbers: 'on',
                        folding: true,
                        fontSize,
                        wordWrap: wrap ? 'on' : 'off',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        renderLineHighlight: 'all',
                        contextmenu: true,
                        selectOnLineNumbers: true,
                        cursorStyle: 'line',
                        smoothScrolling: true,
                        padding: {
                            top: 12,
                            bottom: 12,
                        },
                        scrollbar: {
                            verticalScrollbarSize: 10,
                            horizontalScrollbarSize: 10,
                        },
                    }}
                />
            </Box>
        </Box>
    );
}