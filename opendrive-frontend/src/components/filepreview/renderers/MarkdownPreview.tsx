import { useCallback, useEffect, useRef } from 'react';

import {
    Alert,
    Box,
    CircularProgress,
    IconButton,
    Tooltip,
    Typography,
} from '@mui/material';

import { MdPrint } from 'react-icons/md';

import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import type { PreviewProps } from '../previewTypes';
import { MAX_TEXT_BYTES, useTextContent } from '../previews/useTextContent';

const PRINT_CSS = `
    @page { margin: 16mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; }
    body {
        color: #000;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 11pt;
        line-height: 1.55;
        word-break: break-word;
    }
    h1, h2, h3, h4, h5, h6 { line-height: 1.25; margin: 1.4em 0 0.6em; break-after: avoid; }
    h1 { font-size: 1.9em; border-bottom: 1px solid #ccc; padding-bottom: 0.25em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #ddd; padding-bottom: 0.25em; }
    h3 { font-size: 1.25em; }
    p, ul, ol, blockquote, pre, table { margin: 0 0 1em; }
    a { color: #0b57d0; text-decoration: underline; }
    a[href^="http"]::after { content: " (" attr(href) ")"; font-size: 85%; color: #555; word-break: break-all; }
    img { max-width: 100%; break-inside: avoid; }
    blockquote { margin-left: 0; padding: 0 1em; color: #444; border-left: 4px solid #ccc; }
    code {
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 90%;
        background: #f1f1f1;
        padding: 0.1em 0.3em;
        border-radius: 3px;
    }
    pre {
        padding: 0.8em 1em;
        background: #f6f6f6;
        border: 1px solid #ddd;
        border-radius: 4px;
        white-space: pre-wrap;
        word-break: break-word;
        break-inside: avoid;
    }
    pre code { background: none; padding: 0; font-size: 90%; }
    table { border-collapse: collapse; width: auto; max-width: 100%; }
    th, td { border: 1px solid #bbb; padding: 0.4em 0.7em; }
    th { background: #f1f1f1; }
    tr { break-inside: avoid; }
    hr { border: 0; border-top: 1px solid #ccc; margin: 1.5em 0; }
`;

const escapeHtml = (value: string): string =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

export default function MarkdownPreview({ file, src }: Readonly<PreviewProps>) {
    const { loading, error, text, truncated } = useTextContent(src);
    const contentRef = useRef<HTMLDivElement>(null);

    const handlePrint = useCallback(() => {
        const node = contentRef.current;
        if (!node) return;

        const iframe = document.createElement('iframe');
        // No scripts can run inside; allow-modals is required for print()
        iframe.setAttribute('sandbox', 'allow-same-origin allow-modals');
        iframe.setAttribute('aria-hidden', 'true');
        Object.assign(iframe.style, {
            position: 'fixed',
            right: '0',
            bottom: '0',
            width: '0',
            height: '0',
            border: '0',
        });

        let cleaned = false;
        const cleanup = () => {
            if (cleaned) return;
            cleaned = true;
            iframe.remove();
        };

        iframe.onload = async () => {
            const win = iframe.contentWindow;
            const doc = iframe.contentDocument;
            if (!win || !doc) {
                cleanup();
                return;
            }

            // Wait for images so they aren't missing from the printout
            await Promise.all(
                Array.from(doc.images).map((img) =>
                    img.complete
                        ? Promise.resolve()
                        : new Promise<void>((resolve) => {
                              img.onload = () => resolve();
                              img.onerror = () => resolve();
                          }),
                ),
            );

            win.addEventListener('afterprint', cleanup);
            win.focus();
            win.print();

            // Fallback in case 'afterprint' never fires
            setTimeout(cleanup, 60_000);
        };

        iframe.srcdoc =
            '<!doctype html><html><head><meta charset="utf-8">' +
            `<title>${escapeHtml(file.fileName)}</title>` +
            `<style>${PRINT_CSS}</style></head>` +
            `<body>${node.innerHTML}</body></html>`;

        document.body.appendChild(iframe);
    }, [file.fileName]);

    // Ctrl/⌘ + P prints the markdown instead of the whole app
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p' && contentRef.current) {
                e.preventDefault();
                handlePrint();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [handlePrint]);

    if (loading) {
        return (
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex',
                       alignItems: 'center', justifyContent: 'center', bgcolor: '#2b2b2b' }}>
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
                   flexDirection: 'column', bgcolor: '#2b2b2b' }}>
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
                <Tooltip title="Print (Ctrl/⌘ + P)">
                    <IconButton
                        size="small"
                        onClick={handlePrint}
                        aria-label="Print"
                        sx={{
                            color: '#fff',
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
                        }}
                    >
                        <MdPrint size={20} />
                    </IconButton>
                </Tooltip>

                {truncated && (
                    <Typography fontSize={12} sx={{ ml: 'auto', mr: 1, color: '#ffb74d' }}>
                        Showing first {MAX_TEXT_BYTES / (1024 * 1024)} MB only. Download for the full file.
                    </Typography>
                )}
            </Box>

            {/* Rendered document */}
            <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', p: { xs: 1, sm: 3 } }}>
                <Box
                    sx={{
                        maxWidth: 860,
                        mx: 'auto',
                        p: { xs: 2, sm: 4 },
                        bgcolor: '#fff',
                        color: '#1f2328',
                        // borderRadius: 1,
                        fontSize: 15,
                        lineHeight: 1.65,
                        wordBreak: 'break-word',
                        '& h1, & h2, & h3, & h4': { lineHeight: 1.25, mt: 3, mb: 1.5 },
                        '& h1': { fontSize: '2em', borderBottom: '1px solid #d8dee4', pb: 0.5 },
                        '& h2': { fontSize: '1.5em', borderBottom: '1px solid #d8dee4', pb: 0.5 },
                        '& p, & ul, & ol, & blockquote, & pre, & table': { mt: 0, mb: 2 },
                        '& a': { color: '#0969da' },
                        '& img': { maxWidth: '100%' },
                        '& blockquote': { m: 0, px: 2, color: '#59636e', borderLeft: '4px solid #d0d7de' },
                        '& code': {
                            px: '0.3em',
                            py: '0.15em',
                            bgcolor: '#eff1f3',
                            borderRadius: '4px',
                            fontSize: '85%',
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                        },
                        '& pre': { p: 2, overflow: 'auto', bgcolor: '#f6f8fa', borderRadius: '6px' },
                        '& pre code': { p: 0, bgcolor: 'transparent', fontSize: '90%' },
                        '& table': { borderCollapse: 'collapse', display: 'block', overflow: 'auto' },
                        '& th, & td': { border: '1px solid #d0d7de', px: 1.5, py: 0.75 },
                        '& th': { bgcolor: '#f6f8fa' },
                        '& hr': { border: 0, borderTop: '1px solid #d8dee4', my: 3 },
                    }}
                >
                    {/* Only this node is copied into the printout */}
                    <div ref={contentRef}>
                        <Markdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                a: ({ href, children }) => (
                                    <a href={href} target="_blank" rel="noopener noreferrer">
                                        {children}
                                    </a>
                                ),
                            }}
                        >
                            {text}
                        </Markdown>
                    </div>
                </Box>
            </Box>
        </Box>
    );
}