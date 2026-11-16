import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentProps } from 'react';

import { Alert, Box, Button, CircularProgress, Snackbar } from '@mui/material';

import * as a1sheet from 'a1sheet';
import { Spreadsheet } from 'a1sheet/react';

import { filesApi } from '../../../api/driveApi'; // adjust path
import type { PreviewProps } from '../previewTypes';

type Workbook = NonNullable<
    ComponentProps<typeof Spreadsheet>['defaultWorkbook']
>;
type ParsedWorkbook = Awaited<ReturnType<typeof a1sheet.readWorkbookFile>>;

const XLSX_MIME =
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Parsed .xlsx model -> editor model (fills defaults, arrays -> Sets). */
function toEditorWorkbook(parsed: ParsedWorkbook): Workbook {
    return {
        ...parsed,
        activeSheetIndex: 0,
        sheets: parsed.sheets.map((s) => ({
            ...a1sheet.makeSheet(s.name),
            ...s,
            hiddenRows: new Set<number>(s.hiddenRows ?? []),
            hiddenCols: new Set<number>(s.hiddenCols ?? []),
        })),
    };
}

/** Editor model -> bytes of an .xlsx file. */
function workbookToXlsxBytes(workbook: Workbook): Uint8Array {
    return a1sheet.writeXlsx(workbook.sheets);
}

export default function ExcelPreview({ file, src }: Readonly<PreviewProps>) {
    const [workbook, setWorkbook] = useState<Workbook | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

    // Checksum of the version the user opened, for the conflict check
    const checksumRef = useRef<string | undefined>(undefined);

    const canEdit = file.fileName.toLowerCase().endsWith('.xlsx');

    useEffect(() => {
        const controller = new AbortController();

        async function loadExcel() {
            try {
                setLoading(true);
                setError(null);
                setWorkbook(null);
                setDirty(false);

                const response = await fetch(src, { signal: controller.signal });
                if (!response.ok) {
                    throw new Error(`Unable to load Excel file: ${response.status}`);
                }

                const blob = await response.blob();
                const f = new File([blob], 'preview.xlsx', {
                    type: blob.type || XLSX_MIME,
                });

                const parsed = await a1sheet.readWorkbookFile(f);
                if (!parsed?.sheets?.length) throw new Error('No worksheets found.');

                const wb = toEditorWorkbook(parsed);
                checksumRef.current = file.checksum ?? undefined;

                if (!controller.signal.aborted) {
                    setWorkbook(wb);
                    setLoading(false);
                }
            } catch (err) {
                if (controller.signal.aborted) return;
                console.error('Excel preview error:', err);
                setError(err instanceof Error ? err.message : 'Unable to preview Excel file.');
                setLoading(false);
            }
        }

        void loadExcel();
        return () => controller.abort();
    }, [src, file]);

    // Controlled mode: every edit arrives here
    const handleWorkbookChange = useCallback((wb: Workbook) => {
        setWorkbook(wb);
        setDirty(true);
    }, []);

    const handleSave = async () => {
        if (!workbook) return;
        try {
            setSaving(true);

            const bytes = workbookToXlsxBytes(workbook);
            const blob = new Blob([bytes as BlobPart], { type: XLSX_MIME });

            const saved = await filesApi.saveContent(
                file.id,
                blob,
                file.fileName,
                checksumRef.current,
            );

            checksumRef.current = saved.checksum ?? undefined;
            setDirty(false);
            setToast({ ok: true, msg: 'Saved' });
        } catch (err: unknown) {
            console.error('Save error:', err);
            const status = (err as { response?: { status?: number } })?.response?.status;
            setToast({
                ok: false,
                msg:
                    status === 409
                        ? 'Someone else changed this file. Reload before saving.'
                        : 'Save failed. Please try again.',
            });
        } finally {
            setSaving(false);
        }
    };

    // Warn before closing the tab with unsaved edits
    useEffect(() => {
        if (!dirty) return;
        const handler = (e: BeforeUnloadEvent) => e.preventDefault();
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [dirty]);

    if (loading) {
        return (
            <Box
                sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: '#fff',
                }}
            >
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

    if (!workbook) return null;

    return (
        <Box
            sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                bgcolor: '#fff',
            }}
        >
            {canEdit ? (
                <Box
                    sx={{
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        px: 2,
                        py: 0.75,
                        borderBottom: '1px solid #e0e0e0',
                    }}
                >
                    <Button
                        size="small"
                        variant="contained"
                        onClick={handleSave}
                        disabled={!dirty || saving}
                        startIcon={
                            saving ? <CircularProgress size={14} color="inherit" /> : undefined
                        }
                    >
                        {saving ? 'Saving…' : 'Save'}
                    </Button>
                    <Box sx={{ fontSize: 12, color: '#666' }}>
                        {dirty ? 'Unsaved changes' : 'All changes saved'}
                    </Box>
                </Box>
            ) : (
                <Alert severity="info" sx={{ flexShrink: 0, borderRadius: 0 }}>
                    This file type is view-only.
                </Alert>
            )}

            <Box sx={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
                <Spreadsheet
                    key={src}
                    workbook={workbook}
                    onWorkbookChange={handleWorkbookChange}
                    height="100%"
                />
            </Box>

            <Snackbar
                open={!!toast}
                autoHideDuration={3500}
                onClose={() => setToast(null)}
            >
                {toast ? (
                    <Alert
                        severity={toast.ok ? 'success' : 'error'}
                        onClose={() => setToast(null)}
                    >
                        {toast.msg}
                    </Alert>
                ) : undefined}
            </Snackbar>
        </Box>
    );
}