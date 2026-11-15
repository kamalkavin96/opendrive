import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';

import {
    Alert,
    Box,
    CircularProgress,
    IconButton,
    InputBase,
    Tooltip,
    Typography,
} from '@mui/material';

import {
    MdFitScreen,
    MdKeyboardArrowDown,
    MdKeyboardArrowUp,
    MdZoomIn,
    MdZoomOut,
} from 'react-icons/md';

import { renderAsync } from 'docx-preview';

import type { PreviewProps } from '../previewTypes';

const SIDE_PADDING = 32;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3];

const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

const controlSx = {
    color: '#fff',
    '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
    '&.Mui-disabled': { color: 'rgba(255,255,255,0.3)' },
};

export default function DocxPreview({ src }: Readonly<PreviewProps>) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const hostRef = useRef<HTMLDivElement>(null);

    const pageWidthRef = useRef(0);          // natural (unzoomed) page width
    const scrollRatioRef = useRef(0);        // scroll position as a fraction, kept across zooms
    const zoomRef = useRef(1);               // latest effective zoom, for the wheel handler
    const frameRef = useRef<number | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [totalPages, setTotalPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(0);   // 0-based
    const [pageInput, setPageInput] = useState('1');

    const [fitMode, setFitMode] = useState(true);
    const [fitZoom, setFitZoom] = useState(1);
    const [customZoom, setCustomZoom] = useState(1);

    const zoom = fitMode ? fitZoom : customZoom;
    zoomRef.current = zoom;

    const getPages = useCallback((): HTMLElement[] => {
        const host = hostRef.current;
        return host
            ? Array.from(host.querySelectorAll<HTMLElement>('section.docx'))
            : [];
    }, []);

    const updateFit = useCallback(() => {
        const scroller = scrollRef.current;
        const width = pageWidthRef.current;
        if (!scroller || !width) return;
        setFitZoom(
            Math.min(1, Math.max(0.1, (scroller.clientWidth - SIDE_PADDING) / width)),
        );
    }, []);

    // Which page is at the top of the viewport?
    const updateCurrentPage = useCallback(() => {
        const scroller = scrollRef.current;
        if (!scroller) return;

        const pages = getPages();
        const limit =
            scroller.getBoundingClientRect().top + scroller.clientHeight * 0.35;

        let current = 0;
        pages.forEach((page, i) => {
            if (page.getBoundingClientRect().top <= limit) current = i;
        });
        setCurrentPage(current);
    }, [getPages]);

    // Load and render
    useEffect(() => {
        const controller = new AbortController();
        const host = hostRef.current;

        async function loadDocx() {
            if (!host) return;
            try {
                setLoading(true);
                setError(null);
                setTotalPages(0);
                setCurrentPage(0);
                setFitMode(true);
                host.innerHTML = '';
                host.style.zoom = '1';

                const response = await fetch(src, { signal: controller.signal });
                if (!response.ok) {
                    throw new Error(`Unable to load document: ${response.status}`);
                }

                const buffer = await response.arrayBuffer();
                if (controller.signal.aborted) return;

                await renderAsync(buffer, host, undefined, {
                    className: 'docx',
                    inWrapper: true,
                    breakPages: true,
                    ignoreWidth: false,
                    ignoreHeight: false,
                    renderHeaders: true,
                    renderFooters: true,
                    renderFootnotes: true,
                    renderEndnotes: true,
                });
                if (controller.signal.aborted) return;

                const pages = Array.from(
                    host.querySelectorAll<HTMLElement>('section.docx'),
                );
                pageWidthRef.current = pages[0]?.offsetWidth ?? 0;
                setTotalPages(pages.length);
                scrollRatioRef.current = 0;
                updateFit();
                setLoading(false);
            } catch (err) {
                if (controller.signal.aborted) return;
                console.error('DOCX preview error:', err);
                setError(err instanceof Error ? err.message : 'Unable to preview document.');
                setLoading(false);
            }
        }

        void loadDocx();

        return () => {
            controller.abort();
            if (host) host.innerHTML = '';
        };
    }, [src, updateFit]);

    // Apply zoom, keeping the reading position
    useLayoutEffect(() => {
        const scroller = scrollRef.current;
        const host = hostRef.current;
        if (!scroller || !host || loading) return;

        host.style.zoom = String(zoom);
        scroller.scrollTop = scrollRatioRef.current * scroller.scrollHeight;
        updateCurrentPage();
    }, [zoom, loading, updateCurrentPage]);

    // Re-fit when the available width changes
    useEffect(() => {
        const scroller = scrollRef.current;
        if (!scroller) return;
        const observer = new ResizeObserver(updateFit);
        observer.observe(scroller);
        return () => observer.disconnect();
    }, [updateFit]);

    // Scroll tracking (throttled to animation frames)
    const handleScroll = () => {
        const scroller = scrollRef.current;
        if (!scroller) return;

        if (scroller.scrollHeight > 0) {
            scrollRatioRef.current = scroller.scrollTop / scroller.scrollHeight;
        }
        if (frameRef.current !== null) return;
        frameRef.current = requestAnimationFrame(() => {
            frameRef.current = null;
            updateCurrentPage();
        });
    };

    useEffect(
        () => () => {
            if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
        },
        [],
    );

    // Keep the page box in sync with the current page
    useEffect(() => {
        setPageInput(String(currentPage + 1));
    }, [currentPage]);

    // Ctrl/Cmd + wheel zoom (needs a non-passive listener to block browser zoom)
    useEffect(() => {
        const scroller = scrollRef.current;
        if (!scroller) return;

        const onWheel = (e: WheelEvent) => {
            if (!e.ctrlKey && !e.metaKey) return;
            e.preventDefault();
            setFitMode(false);
            setCustomZoom(clampZoom(zoomRef.current * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
        };

        scroller.addEventListener('wheel', onWheel, { passive: false });
        return () => scroller.removeEventListener('wheel', onWheel);
    }, []);

    const goToPage = useCallback(
        (index: number) => {
            const scroller = scrollRef.current;
            const pages = getPages();
            if (!scroller || pages.length === 0) return;

            const target = pages[Math.min(Math.max(index, 0), pages.length - 1)];
            const top =
                target.getBoundingClientRect().top -
                scroller.getBoundingClientRect().top +
                scroller.scrollTop -
                8;
            scroller.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
        },
        [getPages],
    );

    const zoomIn = () => {
        const next = ZOOM_STEPS.find((s) => s > zoom * 1.001) ?? MAX_ZOOM;
        setFitMode(false);
        setCustomZoom(clampZoom(next));
    };

    const zoomOut = () => {
        const prev = [...ZOOM_STEPS].reverse().find((s) => s < zoom / 1.001) ?? MIN_ZOOM;
        setFitMode(false);
        setCustomZoom(clampZoom(prev));
    };

    const resetZoom = () => {
        setFitMode(false);
        setCustomZoom(1);
    };

    const commitPageInput = () => {
        const n = Number.parseInt(pageInput, 10);
        if (Number.isNaN(n)) {
            setPageInput(String(currentPage + 1));
            return;
        }
        goToPage(n - 1);
    };

    return (
        <Box
            sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                bgcolor: '#2b2b2b',
            }}
        >
            {/* Scrolling document area */}
            <Box
                ref={scrollRef}
                onScroll={handleScroll}
                sx={{
                    flex: 1,
                    minHeight: 0,
                    position: 'relative',
                    overflow: 'auto',
                }}
            >
                {loading && (
                    <Box
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <CircularProgress size={28} sx={{ color: '#fff' }} />
                    </Box>
                )}

                {error && (
                    <Box sx={{ p: 3 }}>
                        <Alert severity="error">{error}</Alert>
                    </Box>
                )}

                <Box
                    ref={hostRef}
                    sx={{
                        display: error ? 'none' : 'block',
                        visibility: loading ? 'hidden' : 'visible',
                        '& .docx-wrapper': {
                            bgcolor: '#2b2b2b',
                            p: '16px 0',
                            // "safe" keeps the left edge reachable when zoomed past the width
                            alignItems: 'safe center',
                        },
                        '& .docx-wrapper > section.docx': {
                            boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
                            mb: '16px',
                        },
                    }}
                />
            </Box>

            {/* Controls */}
            {!error && (
                <Box
                    sx={{
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexWrap: 'wrap',
                        gap: 0.5,
                        py: 0.5,
                        px: 1,
                        bgcolor: 'rgba(15,15,15,0.95)',
                        borderTop: '1px solid rgba(255,255,255,0.12)',
                    }}
                >
                    <Tooltip title="Previous page">
                        <span>
                            <IconButton
                                size="small"
                                onClick={() => goToPage(currentPage - 1)}
                                disabled={loading || currentPage <= 0}
                                sx={controlSx}
                            >
                                <MdKeyboardArrowUp size={22} />
                            </IconButton>
                        </span>
                    </Tooltip>

                    <Typography fontSize={13} sx={{ color: '#fff' }}>
                        Page
                    </Typography>
                    <InputBase
                        value={pageInput}
                        disabled={loading || totalPages === 0}
                        onChange={(e) => setPageInput(e.target.value.replace(/\D/g, ''))}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                commitPageInput();
                                (e.target as HTMLInputElement).blur();
                            }
                        }}
                        onBlur={() => setPageInput(String(currentPage + 1))}
                        inputProps={{ inputMode: 'numeric', 'aria-label': 'Page number' }}
                        sx={{
                            width: 44,
                            color: '#fff',
                            '& input': {
                                textAlign: 'center',
                                p: '2px 0',
                                fontSize: 13,
                                border: '1px solid rgba(255,255,255,0.3)',
                                borderRadius: '4px',
                            },
                        }}
                    />
                    <Typography fontSize={13} sx={{ color: '#fff', minWidth: 36 }}>
                        / {totalPages || '–'}
                    </Typography>

                    <Tooltip title="Next page">
                        <span>
                            <IconButton
                                size="small"
                                onClick={() => goToPage(currentPage + 1)}
                                disabled={loading || currentPage >= totalPages - 1}
                                sx={controlSx}
                            >
                                <MdKeyboardArrowDown size={22} />
                            </IconButton>
                        </span>
                    </Tooltip>

                    <Box sx={{ width: 16 }} />

                    <Tooltip title="Zoom out">
                        <span>
                            <IconButton
                                size="small"
                                onClick={zoomOut}
                                disabled={loading || zoom <= MIN_ZOOM}
                                sx={controlSx}
                            >
                                <MdZoomOut size={22} />
                            </IconButton>
                        </span>
                    </Tooltip>

                    <Tooltip title="Reset to 100%">
                        <span>
                            <Typography
                                fontSize={13}
                                onClick={loading ? undefined : resetZoom}
                                sx={{
                                    color: '#fff',
                                    minWidth: 48,
                                    textAlign: 'center',
                                    cursor: loading ? 'default' : 'pointer',
                                    userSelect: 'none',
                                }}
                            >
                                {Math.round(zoom * 100)}%
                            </Typography>
                        </span>
                    </Tooltip>

                    <Tooltip title="Zoom in">
                        <span>
                            <IconButton
                                size="small"
                                onClick={zoomIn}
                                disabled={loading || zoom >= MAX_ZOOM}
                                sx={controlSx}
                            >
                                <MdZoomIn size={22} />
                            </IconButton>
                        </span>
                    </Tooltip>

                    <Tooltip title="Fit to width">
                        <span>
                            <IconButton
                                size="small"
                                onClick={() => setFitMode(true)}
                                disabled={loading || fitMode}
                                sx={controlSx}
                            >
                                <MdFitScreen size={20} />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Box>
            )}
        </Box>
    );
}