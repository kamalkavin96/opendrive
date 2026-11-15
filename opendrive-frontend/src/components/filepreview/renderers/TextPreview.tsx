import { useMemo, useState } from 'react';

import {
    Alert,
    Box,
    CircularProgress,
    IconButton,
    Tooltip,
    Typography,
} from '@mui/material';

import { MdCheck, MdCode, MdContentCopy, MdWrapText, MdZoomIn, MdZoomOut } from 'react-icons/md';


import type { PreviewProps } from '../previewTypes';
import { MAX_TEXT_BYTES, useTextContent } from '../previews/useTextContent';

const FONT_SIZES = [11, 12, 13, 14, 16, 18, 20];

const controlSx = {
    color: '#fff',
    '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
    '&.Mui-disabled': { color: 'rgba(255,255,255,0.3)' },
};

export default function TextPreview({ file, src }: Readonly<PreviewProps>) {
    const { loading, error, text, truncated } = useTextContent(src);

    const [wrap, setWrap] = useState(false);
    const [fontIdx, setFontIdx] = useState(2);
    const [formatted, setFormatted] = useState(false);
    const [copied, setCopied] = useState(false);

    const isJson = file.fileName.toLowerCase().endsWith('.json');

    const prettyText = useMemo(() => {
        if (!isJson || truncated || !text) return null;
        try {
            return JSON.stringify(JSON.parse(text), null, 2);
        } catch {
            return null; // invalid JSON: leave it as-is
        }
    }, [isJson, truncated, text]);

    const shown = formatted && prettyText !== null ? prettyText : text;

    // Line numbers only make sense when lines don't wrap
    const gutter = useMemo(() => {
        if (wrap || !shown) return '';
        const count = shown.split('\n').length;
        return Array.from({ length: count }, (_, i) => i + 1).join('\n');
    }, [wrap, shown]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shown);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch (err) {
            console.error('Copy failed:', err);
        }
    };

    const fontSize = FONT_SIZES[fontIdx];

    if (loading) {
        return (
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex',
                       alignItems: 'center', justifyContent: 'center', bgcolor: '#1e1e1e' }}>
                <CircularProgress size={28} sx={{ color: '#fff' }} />
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
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex',
                   flexDirection: 'column', bgcolor: '#1e1e1e' }}>
            {/* Toolbar */}
            <Box
                sx={{
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 1,
                    py: 0.5,
                    bgcolor: 'rgba(15,15,15,0.95)',
                    borderBottom: '1px solid rgba(255,255,255,0.12)',
                }}
            >
                <Tooltip title={wrap ? 'Wrap: on' : 'Wrap: off'}>
                    <IconButton size="small" onClick={() => setWrap((w) => !w)}
                                sx={{ ...controlSx, color: wrap ? '#4fc3f7' : '#fff' }}>
                        <MdWrapText size={20} />
                    </IconButton>
                </Tooltip>

                <Tooltip title="Smaller text">
                    <span>
                        <IconButton size="small" onClick={() => setFontIdx((i) => Math.max(0, i - 1))}
                                    disabled={fontIdx === 0} sx={controlSx}>
                            <MdZoomOut size={20} />
                        </IconButton>
                    </span>
                </Tooltip>
                <Typography fontSize={12} sx={{ color: '#fff', minWidth: 28, textAlign: 'center' }}>
                    {fontSize}
                </Typography>
                <Tooltip title="Larger text">
                    <span>
                        <IconButton size="small"
                                    onClick={() => setFontIdx((i) => Math.min(FONT_SIZES.length - 1, i + 1))}
                                    disabled={fontIdx === FONT_SIZES.length - 1} sx={controlSx}>
                            <MdZoomIn size={20} />
                        </IconButton>
                    </span>
                </Tooltip>

                {isJson && (
                    <Tooltip title={prettyText === null ? 'Cannot format (invalid or truncated JSON)' : 'Format JSON'}>
                        <span>
                            <IconButton size="small" onClick={() => setFormatted((f) => !f)}
                                        disabled={prettyText === null}
                                        sx={{ ...controlSx, color: formatted ? '#4fc3f7' : '#fff' }}>
                                <MdCode size={20} />
                            </IconButton>
                        </span>
                    </Tooltip>
                )}

                <Tooltip title={copied ? 'Copied' : 'Copy all'}>
                    <IconButton size="small" onClick={handleCopy} sx={controlSx}>
                        {copied ? <MdCheck size={20} /> : <MdContentCopy size={18} />}
                    </IconButton>
                </Tooltip>

                {truncated && (
                    <Typography fontSize={12} sx={{ ml: 'auto', mr: 1, color: '#ffb74d' }}>
                        Showing first {MAX_TEXT_BYTES / (1024 * 1024)} MB only. Download for the full file.
                    </Typography>
                )}
            </Box>

            {/* Content */}
            <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                {shown.length === 0 ? (
                    <Typography sx={{ p: 3, color: 'rgba(255,255,255,0.6)' }} fontSize={14}>
                        This file is empty.
                    </Typography>
                ) : (
                    <Box sx={{ display: 'flex', minWidth: 'min-content' }}>
                        {!wrap && (
                            <Box
                                component="pre"
                                aria-hidden
                                sx={{
                                    m: 0,
                                    py: 1.5,
                                    px: 1.5,
                                    position: 'sticky',
                                    left: 0,
                                    flexShrink: 0,
                                    textAlign: 'right',
                                    userSelect: 'none',
                                    color: 'rgba(255,255,255,0.35)',
                                    bgcolor: '#1e1e1e',
                                    borderRight: '1px solid rgba(255,255,255,0.1)',
                                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                                    fontSize,
                                    lineHeight: 1.5,
                                }}
                            >
                                {gutter}
                            </Box>
                        )}
                        <Box
                            component="pre"
                            sx={{
                                m: 0,
                                py: 1.5,
                                px: 2,
                                flex: 1,
                                color: '#e6e6e6',
                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                                fontSize,
                                lineHeight: 1.5,
                                tabSize: 4,
                                whiteSpace: wrap ? 'pre-wrap' : 'pre',
                                wordBreak: wrap ? 'break-word' : 'normal',
                            }}
                        >
                            {shown}
                        </Box>
                    </Box>
                )}
            </Box>
        </Box>
    );
}