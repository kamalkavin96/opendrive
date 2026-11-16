import { useCallback, useEffect, useRef, useState } from 'react';

import { Alert, Box, CircularProgress, IconButton, Tooltip, Typography } from '@mui/material';

import { MdChevronLeft, MdChevronRight, MdFullscreen } from 'react-icons/md';

import { init } from 'pptx-preview';

import type { PreviewProps } from '../previewTypes';

// Slides are rendered at a fixed base size, then scaled with CSS to fit
const BASE_W = 960;
const BASE_H = 540;

// Methods used from the previewer in slide mode (see note on API verification)
interface SlidePreviewer {
    preview(data: ArrayBuffer): Promise<unknown>;
    renderNextSlide?: () => void;
    renderPreSlide?: () => void;
    slideCount?: number;
}

export default function PptxPreview({ src }: Readonly<PreviewProps>) {
    const stageRef = useRef<HTMLDivElement>(null);   // fullscreen target + scaling area
    const hostRef = useRef<HTMLDivElement>(null);    // the library renders in here
    const previewerRef = useRef<SlidePreviewer | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [index, setIndex] = useState(0);
    const [total, setTotal] = useState(0);
    const [scale, setScale] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Load and render
    useEffect(() => {
        const controller = new AbortController();
        const host = hostRef.current;

        async function loadPptx() {
            if (!host) return;
            try {
                setLoading(true);
                setError(null);
                setIndex(0);
                setTotal(0);
                host.innerHTML = '';
                previewerRef.current = null;

                const response = await fetch(src, { signal: controller.signal });
                if (!response.ok) {
                    throw new Error(`Unable to load presentation: ${response.status}`);
                }
                const buffer = await response.arrayBuffer();
                if (controller.signal.aborted) return;

                const previewer = init(host, {
                    width: BASE_W,
                    height: BASE_H,
                    mode: 'slide',
                } as Parameters<typeof init>[1]) as unknown as SlidePreviewer;

                await previewer.preview(buffer);
                if (controller.signal.aborted) return;

                if (
                    typeof previewer.renderNextSlide !== 'function' ||
                    typeof previewer.renderPreSlide !== 'function'
                ) {
                    console.log('pptx-preview previewer methods:', Object.getOwnPropertyNames(
                        Object.getPrototypeOf(previewer),
                    ), Object.keys(previewer));
                    throw new Error(
                        'Slide navigation is not available in this pptx-preview version. See console.',
                    );
                }

                previewerRef.current = previewer;
                setTotal(previewer.slideCount ?? 0);
                setLoading(false);
            } catch (err) {
                if (controller.signal.aborted) return;
                console.error('PPTX preview error:', err);
                setError(err instanceof Error ? err.message : 'Unable to preview presentation.');
                setLoading(false);
            }
        }

        void loadPptx();

        return () => {
            controller.abort();
            if (host) host.innerHTML = '';
            previewerRef.current = null;
        };
    }, [src]);

    // Scale the fixed-size slide to the available area (normal + fullscreen)
    useEffect(() => {
        const stage = stageRef.current;
        if (!stage) return;

        const update = () => {
            const s = Math.min(stage.clientWidth / BASE_W, stage.clientHeight / BASE_H);
            setScale(s > 0 ? s : 1);
        };
        update();

        const observer = new ResizeObserver(update);
        observer.observe(stage);
        return () => observer.disconnect();
    }, []);

    // Track fullscreen state (Esc exits natively)
    useEffect(() => {
        const onChange = () => setIsFullscreen(document.fullscreenElement === stageRef.current);
        document.addEventListener('fullscreenchange', onChange);
        return () => document.removeEventListener('fullscreenchange', onChange);
    }, []);

    const next = useCallback(() => {
        const p = previewerRef.current;
        if (!p || index >= total - 1) return;
        p.renderNextSlide?.();
        setIndex((i) => i + 1);
    }, [index, total]);

    const prev = useCallback(() => {
        const p = previewerRef.current;
        if (!p || index <= 0) return;
        p.renderPreSlide?.();
        setIndex((i) => i - 1);
    }, [index]);

    const goTo = useCallback(
        (target: number) => {
            const p = previewerRef.current;
            if (!p) return;
            const steps = target - index;
            for (let i = 0; i < Math.abs(steps); i++) {
                if (steps > 0) p.renderNextSlide?.();
                else p.renderPreSlide?.();
            }
            setIndex(target);
        },
        [index],
    );

    // Keyboard controls
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowRight':
                case 'ArrowDown':
                case 'PageDown':
                case ' ':
                    e.preventDefault();
                    next();
                    break;
                case 'ArrowLeft':
                case 'ArrowUp':
                case 'PageUp':
                    e.preventDefault();
                    prev();
                    break;
                case 'Home':
                    e.preventDefault();
                    goTo(0);
                    break;
                case 'End':
                    e.preventDefault();
                    if (total > 0) goTo(total - 1);
                    break;
                default:
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [next, prev, goTo, total]);

    const present = () => {
        void stageRef.current?.requestFullscreen?.();
    };

    const controlSx = {
        color: '#fff',
        '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
        '&.Mui-disabled': { color: 'rgba(255,255,255,0.3)' },
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
            {error && (
                <Box sx={{ p: 3 }}>
                    <Alert severity="error">{error}</Alert>
                </Box>
            )}

            {/* Stage: scales the slide, and is the element that goes fullscreen */}
            <Box
                ref={stageRef}
                sx={{
                    flex: 1,
                    minHeight: 0,
                    position: 'relative',
                    display: error ? 'none' : 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    bgcolor: isFullscreen ? '#000' : '#2b2b2b',
                }}
            >
                {loading && (
                    <Box sx={{ position: 'absolute', inset: 0, display: 'flex',
                               alignItems: 'center', justifyContent: 'center' }}>
                        <CircularProgress size={28} sx={{ color: '#fff' }} />
                    </Box>
                )}

                <Box
                    ref={hostRef}
                    sx={{
                        flexShrink: 0,
                        width: BASE_W,
                        height: BASE_H,
                        transform: `scale(${scale})`,
                        transformOrigin: 'center center',
                        visibility: loading ? 'hidden' : 'visible',
                    }}
                />

                {/* Click zones for fullscreen presenting */}
                {isFullscreen && (
                    <>
                        <Box onClick={prev} sx={{ position: 'absolute', left: 0, top: 0,
                                                  bottom: 0, width: '25%', cursor: 'w-resize' }} />
                        <Box onClick={next} sx={{ position: 'absolute', right: 0, top: 0,
                                                  bottom: 0, width: '75%', cursor: 'e-resize' }} />
                    </>
                )}
            </Box>

            {/* Controls bar (hidden while fullscreen) */}
            {!error && (
                <Box
                    sx={{
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                        py: 0.5,
                        bgcolor: 'rgba(15,15,15,0.95)',
                        borderTop: '1px solid rgba(255,255,255,0.12)',
                    }}
                >
                    <Tooltip title="Previous slide (←)">
                        <span>
                            <IconButton size="small" onClick={prev}
                                        disabled={loading || index <= 0} sx={controlSx}>
                                <MdChevronLeft size={22} />
                            </IconButton>
                        </span>
                    </Tooltip>

                    <Typography fontSize={13} sx={{ color: '#fff', minWidth: 70, textAlign: 'center' }}>
                        {total > 0 ? `${index + 1} / ${total}` : '–'}
                    </Typography>

                    <Tooltip title="Next slide (→)">
                        <span>
                            <IconButton size="small" onClick={next}
                                        disabled={loading || index >= total - 1} sx={controlSx}>
                                <MdChevronRight size={22} />
                            </IconButton>
                        </span>
                    </Tooltip>

                    <Tooltip title="Present fullscreen">
                        <span>
                            <IconButton size="small" onClick={present}
                                        disabled={loading} sx={{ ...controlSx, ml: 2 }}>
                                <MdFullscreen size={22} />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Box>
            )}
        </Box>
    );
}