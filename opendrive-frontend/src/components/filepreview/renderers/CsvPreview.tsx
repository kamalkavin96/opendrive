import { useMemo, useState } from 'react';

import {
    Alert,
    Box,
    CircularProgress,
    FormControlLabel,
    Switch,
    Typography,
} from '@mui/material';

import type { PreviewProps } from '../previewTypes';
import { MAX_TEXT_BYTES, useTextContent } from '../previews/useTextContent';

const MAX_ROWS = 5000;

function sniffDelimiter(text: string, fileName: string): string {
    if (fileName.toLowerCase().endsWith('.tsv')) return '\t';
    const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
    const candidates = [',', ';', '\t', '|'];
    let best = ',';
    let bestCount = 0;
    for (const c of candidates) {
        const count = firstLine.split(c).length - 1;
        if (count > bestCount) {
            best = c;
            bestCount = count;
        }
    }
    return best;
}

/** Small RFC 4180 parser: quoted fields, "" escapes, CRLF/LF, newlines inside quotes. */
function parseDelimited(text: string, delimiter: string, maxRows: number) {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let inQuotes = false;
    let hitLimit = false;

    const pushRow = () => {
        row.push(field);
        field = '';
        rows.push(row);
        row = [];
    };

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];

        if (inQuotes) {
            if (ch === '"') {
                if (text[i + 1] === '"') {
                    field += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                field += ch;
            }
            continue;
        }

        if (ch === '"') {
            inQuotes = true;
        } else if (ch === delimiter) {
            row.push(field);
            field = '';
        } else if (ch === '\n' || ch === '\r') {
            if (ch === '\r' && text[i + 1] === '\n') i++;
            pushRow();
            if (rows.length >= maxRows) {
                hitLimit = true;
                break;
            }
        } else {
            field += ch;
        }
    }

    if (!hitLimit && (field !== '' || row.length > 0)) pushRow();

    return { rows, hitLimit };
}

export default function CsvPreview({ file, src }: Readonly<PreviewProps>) {
    const { loading, error, text, truncated } = useTextContent(src);
    const [hasHeader, setHasHeader] = useState(true);

    const { rows, hitLimit } = useMemo(() => {
        if (!text) return { rows: [] as string[][], hitLimit: false };
        return parseDelimited(text, sniffDelimiter(text, file.fileName), MAX_ROWS);
    }, [text, file.fileName]);

    const columnCount = useMemo(
        () => rows.reduce((max, r) => Math.max(max, r.length), 0),
        [rows],
    );

    if (loading) {
        return (
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex',
                       alignItems: 'center', justifyContent: 'center', bgcolor: '#fff' }}>
                <CircularProgress size={28} />
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

    if (rows.length === 0) {
        return (
            <Typography sx={{ p: 3 }} fontSize={14}>
                This file is empty.
            </Typography>
        );
    }

    const header = hasHeader ? rows[0] : null;
    const body = hasHeader ? rows.slice(1) : rows;

    const cellSx = {
        border: '1px solid #e0e0e0',
        px: 1.5,
        py: 0.5,
        fontSize: 13,
        whiteSpace: 'nowrap',
        maxWidth: 360,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    } as const;

    return (
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex',
                   flexDirection: 'column', bgcolor: '#fff' }}>
            <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 2,
                       px: 2, py: 0.5, borderBottom: '1px solid #e0e0e0' }}>
                <FormControlLabel
                    control={<Switch size="small" checked={hasHeader}
                                     onChange={(e) => setHasHeader(e.target.checked)} />}
                    label={<Typography fontSize={13}>First row is header</Typography>}
                />
                <Typography fontSize={12} sx={{ color: '#666' }}>
                    {body.length.toLocaleString()} rows × {columnCount} columns
                </Typography>
                {(hitLimit || truncated) && (
                    <Typography fontSize={12} sx={{ color: '#b25e00' }}>
                        {hitLimit
                            ? `Showing first ${MAX_ROWS.toLocaleString()} rows.`
                            : `Showing first ${MAX_TEXT_BYTES / (1024 * 1024)} MB only.`}{' '}
                        Download for the full file.
                    </Typography>
                )}
            </Box>

            <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                <Box component="table" sx={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: '100%' }}>
                    {header && (
                        <Box component="thead">
                            <Box component="tr">
                                <Box component="th" sx={{ ...cellSx, position: 'sticky', top: 0, left: 0,
                                                          zIndex: 3, bgcolor: '#f1f3f4' }} />
                                {Array.from({ length: columnCount }, (_, c) => (
                                    <Box component="th" key={c}
                                         sx={{ ...cellSx, position: 'sticky', top: 0, zIndex: 2,
                                               bgcolor: '#f1f3f4', textAlign: 'left', fontWeight: 600 }}>
                                        {header[c] ?? ''}
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    )}
                    <Box component="tbody">
                        {body.map((r, i) => (
                            <Box component="tr" key={i} sx={{ '&:nth-of-type(even) td': { bgcolor: '#fafafa' } }}>
                                <Box component="td" sx={{ ...cellSx, position: 'sticky', left: 0, zIndex: 1,
                                                          bgcolor: '#f1f3f4', color: '#777', textAlign: 'right' }}>
                                    {i + 1}
                                </Box>
                                {Array.from({ length: columnCount }, (_, c) => (
                                    <Box component="td" key={c} title={r[c]} sx={cellSx}>
                                        {r[c] ?? ''}
                                    </Box>
                                ))}
                            </Box>
                        ))}
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}