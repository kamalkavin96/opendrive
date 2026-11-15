import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, SyntheticEvent } from 'react';
import {
  Alert,
  alpha,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  MdCode,
  MdContentCopy,
  MdFileDownload,
  MdFitScreen,
  MdFullscreen,
  MdFullscreenExit,
  MdKeyboardArrowDown,
  MdLayers,
  MdOutlineImage,
  MdOutlinePictureAsPdf,
  MdZoomIn,
  MdZoomOut,
} from 'react-icons/md';

import { jsPDF } from 'jspdf';
import type { PreviewProps } from '../previewTypes';

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DrawioModel {
  getRoot: () => unknown;
  getChildCount: (cell: unknown) => number;
  getChildAt: (cell: unknown, index: number) => unknown;
  isVisible: (cell: unknown) => boolean;
  setVisible: (cell: unknown, visible: boolean) => void;
}

interface DrawioGraph {
  container: HTMLElement;
  model: DrawioModel;
  view: {
    scale: number;
    translate: { x: number; y: number };
    canvas?: SVGElement;
    scaleAndTranslate: (scale: number, dx: number, dy: number) => void;
    setTranslate: (dx: number, dy: number) => void;
  };
  getGraphBounds: () => Rect;
  zoomTo: (scale: number, center?: boolean) => void;
  convertValueToString?: (cell: unknown) => string;
}

interface DrawioViewerInstance {
  graph?: DrawioGraph;
  // An HTMLCollection in the real viewer, not an array.
  diagrams?: ArrayLike<Element>;
  currentPage?: number;
  selectPage?: (index: number) => void;
}

interface DrawioViewer {
  createViewerForElement: (
    element: HTMLElement,
    callback?: (viewer: DrawioViewerInstance) => void,
  ) => void;
}

declare global {
  interface Window {
    GraphViewer?: DrawioViewer;
  }
}

interface LayerInfo {
  cell: unknown;
  name: string;
  visible: boolean;
}

interface ToastState {
  severity: 'success' | 'error';
  message: string;
}

type ExportAction = 'png' | 'pdf' | 'svg' | 'copy';

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const VIEWER_SCRIPT = 'https://viewer.diagrams.net/js/viewer-static.min.js';

const EXPORT_PADDING = 10; // px around the diagram in exported files
const PNG_SCALE = 2;
const MAX_CANVAS_PIXELS = 16_000_000;

const FIT_PADDING = 32; // space around the diagram when fitted
const MAX_FIT_SCALE = 1; // fit never zooms in past 100%
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 1.2;

const ICON = 18;

/* -------------------------------------------------------------------------- */
/* Viewer loading                                                             */
/* -------------------------------------------------------------------------- */

let viewerScriptPromise: Promise<void> | null = null;

function loadDrawioViewer(): Promise<void> {
  if (window.GraphViewer) {
    return Promise.resolve();
  }

  if (viewerScriptPromise) {
    return viewerScriptPromise;
  }

  viewerScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${VIEWER_SCRIPT}"]`,
    );

    const script = existingScript ?? document.createElement('script');

    const handleLoad = () => {
      if (window.GraphViewer) {
        resolve();
      } else {
        viewerScriptPromise = null;
        reject(new Error('draw.io viewer failed to initialize.'));
      }
    };

    const handleError = () => {
      viewerScriptPromise = null;
      reject(new Error('Unable to load draw.io viewer library.'));
    };

    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });

    if (!existingScript) {
      script.src = VIEWER_SCRIPT;
      script.async = true;
      document.head.appendChild(script);
    }
  });

  return viewerScriptPromise;
}

/* -------------------------------------------------------------------------- */
/* Zoom / fit helpers                                                         */
/* -------------------------------------------------------------------------- */

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getZoomPercent(viewer: DrawioViewerInstance | null): number {
  const scale = viewer?.graph?.view.scale;
  return scale ? Math.round(scale * 100) : 100;
}

/** If the diagram is smaller than the area on an axis, center it on that axis. */
function recenterSmallAxes(graph: DrawioGraph) {
  try {
    const bounds = graph.getGraphBounds();
    const width = graph.container.clientWidth;
    const height = graph.container.clientHeight;

    if (!bounds?.width || !bounds?.height || !width || !height) return;

    const { scale, translate } = graph.view;

    let dx = 0;
    let dy = 0;

    if (bounds.width + FIT_PADDING * 2 <= width) {
      dx = (width - bounds.width) / 2 - bounds.x;
    }

    if (bounds.height + FIT_PADDING * 2 <= height) {
      dy = (height - bounds.height) / 2 - bounds.y;
    }

    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
      graph.view.setTranslate(translate.x + dx / scale, translate.y + dy / scale);
    }
  } catch (err) {
    console.warn('Unable to recenter diagram:', err);
  }
}

/** Zoom to an absolute scale around the viewport center. Returns the new percent. */
function zoomToScale(
  viewer: DrawioViewerInstance | null,
  target: number,
): number {
  const graph = viewer?.graph;

  if (!graph) return 100;

  try {
    graph.zoomTo(clamp(target, MIN_ZOOM, MAX_ZOOM), true);
    recenterSmallAxes(graph);
  } catch (err) {
    console.warn('Unable to zoom diagram:', err);
  }

  return getZoomPercent(viewer);
}

/** Scale the diagram to fit the whole area and center it. Returns the new percent. */
function fitDiagram(viewer: DrawioViewerInstance | null): number {
  const graph = viewer?.graph;

  if (!graph) return 100;

  try {
    const { view } = graph;
    const { scale, translate } = view;
    const bounds = graph.getGraphBounds();

    const areaWidth = graph.container.clientWidth;
    const areaHeight = graph.container.clientHeight;

    if (!bounds?.width || !bounds?.height || !areaWidth || !areaHeight) {
      return getZoomPercent(viewer);
    }

    // Diagram size and position in model units (independent of current zoom).
    const modelWidth = bounds.width / scale;
    const modelHeight = bounds.height / scale;
    const modelX = bounds.x / scale - translate.x;
    const modelY = bounds.y / scale - translate.y;

    const newScale = clamp(
      Math.min(
        MAX_FIT_SCALE,
        (areaWidth - FIT_PADDING * 2) / modelWidth,
        (areaHeight - FIT_PADDING * 2) / modelHeight,
      ),
      MIN_ZOOM,
      MAX_ZOOM,
    );

    const dx = (areaWidth / newScale - modelWidth) / 2 - modelX;
    const dy = (areaHeight / newScale - modelHeight) / 2 - modelY;

    view.scaleAndTranslate(newScale, dx, dy);

    graph.container.scrollLeft = 0;
    graph.container.scrollTop = 0;

    return Math.round(newScale * 100);
  } catch (err) {
    console.warn('Unable to fit diagram:', err);
    return getZoomPercent(viewer);
  }
}

/* -------------------------------------------------------------------------- */
/* Export helpers                                                             */
/* -------------------------------------------------------------------------- */

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = fileName;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Build a standalone SVG from the viewer's real graph.
 * The viewBox crops to the diagram at the current zoom, while width/height
 * are converted back to 100% size, so exports never depend on the zoom level.
 */
function getDiagramSvg(
  container: HTMLElement,
  viewer: DrawioViewerInstance | null,
): SVGSVGElement {
  const graph = viewer?.graph;

  const source =
    (graph?.view.canvas?.ownerSVGElement as SVGSVGElement | null | undefined) ??
    container.querySelector<SVGSVGElement>('.geDiagramContainer svg') ??
    container.querySelector<SVGSVGElement>('svg');

  if (!source) {
    throw new Error('Diagram is not rendered yet.');
  }

  let bounds: Rect | null = null;

  try {
    const graphBounds = graph?.getGraphBounds();

    if (graphBounds && graphBounds.width > 0 && graphBounds.height > 0) {
      bounds = graphBounds;
    }
  } catch {
    bounds = null;
  }

  if (!bounds) {
    const box = source.getBBox();
    bounds = { x: box.x, y: box.y, width: box.width, height: box.height };
  }

  if (!bounds.width || !bounds.height) {
    throw new Error('Unable to determine diagram dimensions.');
  }

  const scale = graph?.view.scale || 1;
  const pad = EXPORT_PADDING * scale;

  const viewX = bounds.x - pad;
  const viewY = bounds.y - pad;
  const viewWidth = bounds.width + pad * 2;
  const viewHeight = bounds.height + pad * 2;

  const svg = source.cloneNode(true) as SVGSVGElement;

  // Viewer inline style (fixed size, position, left/top) breaks standalone use.
  svg.removeAttribute('style');
  svg.removeAttribute('class');

  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  svg.setAttribute('viewBox', `${viewX} ${viewY} ${viewWidth} ${viewHeight}`);
  svg.setAttribute('width', String(Math.ceil(viewWidth / scale)));
  svg.setAttribute('height', String(Math.ceil(viewHeight / scale)));

  return svg;
}

/**
 * foreignObject (HTML labels) can fail to rasterize in some browsers.
 * Removing it is a last resort; rich-text labels may be lost.
 */
function stripForeignObjects(svg: SVGSVGElement): SVGSVGElement {
  const copy = svg.cloneNode(true) as SVGSVGElement;
  copy.querySelectorAll('foreignObject').forEach((node) => node.remove());
  return copy;
}

function svgToString(svg: SVGSVGElement): string {
  return new XMLSerializer().serializeToString(svg);
}

function svgToBlob(svg: SVGSVGElement): Blob {
  return new Blob([svgToString(svg)], {
    type: 'image/svg+xml;charset=utf-8',
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to convert diagram to PNG.'));
    image.src = src;
  });
}

async function rasterize(svg: SVGSVGElement): Promise<Blob> {
  const width = Number(svg.getAttribute('width'));
  const height = Number(svg.getAttribute('height'));

  if (!width || !height) {
    throw new Error('Diagram has no size.');
  }

  // Data URL (not blob URL) to avoid tainting the canvas.
  const image = await loadImage(
    'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgToString(svg)),
  );

  const scale = Math.min(
    PNG_SCALE,
    Math.sqrt(MAX_CANVAS_PIXELS / (width * height)),
  );

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(width * scale));
  canvas.height = Math.max(1, Math.floor(height * scale));

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Unable to create canvas.');
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  // toBlob throws if the canvas is tainted and returns null if it is too big.
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/png');
  });

  if (!blob) {
    throw new Error(
      `Unable to generate PNG (canvas ${canvas.width}x${canvas.height}).`,
    );
  }

  return blob;
}

async function svgToPng(svg: SVGSVGElement): Promise<Blob> {
  try {
    return await rasterize(svg);
  } catch (error) {
    console.warn('PNG export failed, retrying without HTML labels:', error);
    return rasterize(stripForeignObjects(svg));
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Unable to read image data.'));
    reader.readAsDataURL(blob);
  });
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function DrawioPreview({ src }: Readonly<PreviewProps>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const diagramRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<DrawioViewerInstance | null>(null);
  const fitModeRef = useRef(true); // true until the user zooms manually

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [fullscreen, setFullscreen] = useState(false);
  const [pages, setPages] = useState<string[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [layers, setLayers] = useState<LayerInfo[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [exportAnchor, setExportAnchor] = useState<HTMLElement | null>(null);
  const [layersAnchor, setLayersAnchor] = useState<HTMLElement | null>(null);

  const disabled = loading || Boolean(error);

  /* ---- helpers that read from the viewer ---- */

  const fitAndSync = useCallback(() => {
    setZoom(fitDiagram(viewerRef.current));
  }, []);

  const refreshMeta = useCallback((viewer: DrawioViewerInstance | null) => {
    const graph = viewer?.graph;

    if (!viewer || !graph) return;

    // Pages: `diagrams` is an HTMLCollection, not an array.
    try {
      const names = Array.from(viewer.diagrams ?? []).map(
        (diagram, index) =>
          diagram.getAttribute('name') || `Page ${index + 1}`,
      );

      setPages(names);
      setPageIndex(viewer.currentPage ?? 0);
    } catch (err) {
      console.warn('Unable to read diagram pages:', err);
      setPages([]);
    }

    // Layers
    try {
      const { model } = graph;
      const root = model.getRoot();
      const count = model.getChildCount(root);
      const list: LayerInfo[] = [];

      for (let i = 0; i < count; i += 1) {
        const cell = model.getChildAt(root, i);

        list.push({
          cell,
          name: graph.convertValueToString?.(cell) || `Layer ${i + 1}`,
          visible: model.isVisible(cell),
        });
      }

      setLayers(list);
    } catch (err) {
      console.warn('Unable to read diagram layers:', err);
      setLayers([]);
    }
  }, []);

  /* ---- render the diagram ---- */

  useEffect(() => {
    let cancelled = false;

    async function renderDiagram() {
      try {
        setLoading(true);
        setError(null);
        setPages([]);
        setLayers([]);
        viewerRef.current = null;
        fitModeRef.current = true;

        const response = await fetch(src, { credentials: 'same-origin' });

        if (!response.ok) {
          throw new Error(`Unable to load diagram: HTTP ${response.status}`);
        }

        const xml = await response.text();

        if (!xml.trim()) {
          throw new Error('The draw.io file is empty.');
        }

        await loadDrawioViewer();

        if (cancelled || !diagramRef.current) {
          return;
        }

        const element = diagramRef.current;

        element.innerHTML = '';
        element.classList.add('mxgraph');

        // No built-in toolbar and no 'resize': the toolbar is our own, and the
        // diagram area always fills the available space.
        element.dataset.mxgraph = JSON.stringify({
          highlight: '#1976d2',
          nav: true,
          lightbox: false,
          center: true,
          'allow-zoom-in': true,
          'allow-zoom-out': true,
          'dark-mode': 'auto',
          xml,
        });

        window.GraphViewer?.createViewerForElement(element, (viewer) => {
          if (cancelled) return;

          viewerRef.current = viewer;
          refreshMeta(viewer);
          fitAndSync();

          // Run again after layout settles.
          requestAnimationFrame(() => {
            if (!cancelled && fitModeRef.current) fitAndSync();
          });
        });

        if (!cancelled) {
          setLoading(false);
        }
      } catch (err) {
        if (cancelled) return;

        console.error('Draw.io preview error:', err);

        setError(
          err instanceof Error ? err.message : 'Unable to preview draw.io file.',
        );

        setLoading(false);
      }
    }

    void renderDiagram();

    return () => {
      cancelled = true;
      viewerRef.current = null;

      if (diagramRef.current) {
        diagramRef.current.innerHTML = '';
      }
    };
  }, [src, fitAndSync, refreshMeta]);

  /* ---- resize + ctrl/cmd-wheel zoom ---- */

  useEffect(() => {
    const area = areaRef.current;

    if (!area) return undefined;

    let timer: number | undefined;

    const observer = new ResizeObserver(() => {
      window.clearTimeout(timer);

      timer = window.setTimeout(() => {
        if (fitModeRef.current) {
          fitAndSync();
        } else {
          const graph = viewerRef.current?.graph;
          if (graph) recenterSmallAxes(graph);
        }
      }, 100);
    });

    observer.observe(area);

    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;

      const viewer = viewerRef.current;

      if (!viewer?.graph) return;

      event.preventDefault();
      fitModeRef.current = false;

      setZoom(
        zoomToScale(
          viewer,
          viewer.graph.view.scale * Math.exp(-event.deltaY * 0.01),
        ),
      );
    };

    area.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
      area.removeEventListener('wheel', handleWheel);
    };
  }, [fitAndSync]);

  /* ---- fullscreen state ---- */

  useEffect(() => {
    const handleChange = () => {
      setFullscreen(document.fullscreenElement === rootRef.current);
    };

    document.addEventListener('fullscreenchange', handleChange);

    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  /* ---- actions ---- */

  const zoomBy = (factor: number) => {
    const viewer = viewerRef.current;

    if (!viewer?.graph) return;

    fitModeRef.current = false;
    setZoom(zoomToScale(viewer, viewer.graph.view.scale * factor));
  };

  const zoomReset = () => {
    fitModeRef.current = false;
    setZoom(zoomToScale(viewerRef.current, 1));
  };

  const handleFit = () => {
    fitModeRef.current = true;
    fitAndSync();
  };

  const toggleFullscreen = () => {
    const root = rootRef.current;

    if (!root) return;

    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      root.requestFullscreen?.().catch(() => {
        setToast({ severity: 'error', message: 'Fullscreen is not available.' });
      });
    }
  };

  const handlePageChange = (_event: SyntheticEvent, index: number) => {
    const viewer = viewerRef.current;

    if (!viewer?.selectPage) return;

    viewer.selectPage(index);
    fitModeRef.current = true;
    setPageIndex(index);

    window.setTimeout(() => {
      refreshMeta(viewer);
      fitAndSync();
    }, 60);
  };

  const toggleLayer = (index: number) => {
    const graph = viewerRef.current?.graph;
    const layer = layers[index];

    if (!graph || !layer) return;

    graph.model.setVisible(layer.cell, !layer.visible);

    setLayers((previous) =>
      previous.map((item, i) =>
        i === index ? { ...item, visible: !item.visible } : item,
      ),
    );
  };

  const handleExport = async (action: ExportAction) => {
    setExportAnchor(null);
    setExporting(true);

    try {
      if (!diagramRef.current) {
        throw new Error('Diagram is not available.');
      }

      const svg = getDiagramSvg(diagramRef.current, viewerRef.current);

      if (action === 'svg') {
        downloadBlob(svgToBlob(svg), 'diagram.svg');
        return;
      }

      const pngBlob = await svgToPng(svg);

      if (action === 'png') {
        downloadBlob(pngBlob, 'diagram.png');
        return;
      }

      if (action === 'copy') {
        if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
          throw new Error('Copying images is not supported in this browser.');
        }

        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': pngBlob }),
        ]);

        setToast({ severity: 'success', message: 'Diagram copied to clipboard.' });
        return;
      }

      // PDF
      const width = Number(svg.getAttribute('width'));
      const height = Number(svg.getAttribute('height'));
      const dataUrl = await blobToDataUrl(pngBlob);

      const pdf = new jsPDF({
        orientation: width > height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [width, height],
        hotfixes: ['px_scaling'],
      });

      pdf.addImage(dataUrl, 'PNG', 0, 0, width, height);
      pdf.save('diagram.pdf');
    } catch (err) {
      console.error('Diagram export error:', err);

      setToast({
        severity: 'error',
        message: err instanceof Error ? err.message : 'Unable to export diagram.',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    // Don't hijack typeahead inside open menus.
    if ((event.target as HTMLElement).closest('[role="menu"]')) return;

    switch (event.key) {
      case '+':
      case '=':
        zoomBy(ZOOM_STEP);
        break;
      case '-':
      case '_':
        zoomBy(1 / ZOOM_STEP);
        break;
      case '0':
        handleFit();
        break;
      case '1':
        zoomReset();
        break;
      case 'f':
      case 'F':
        toggleFullscreen();
        break;
      default:
        return;
    }

    event.preventDefault();
  };

  /* ---- render ---- */

  // Keep menus inside the root so they stay visible in fullscreen.
  const menuContainer = () => rootRef.current;

  return (
    <Box
      ref={rootRef}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      sx={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        outline: 'none',
      }}
    >
      {/* Toolbar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1.5,
          px: 2,
          py: 1,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        {/* Zoom group */}
        <Stack
          direction="row"
          alignItems="center"
          sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}
        >
          <Tooltip title="Zoom out (−)">
            <span>
              <IconButton
                size="small"
                disabled={disabled}
                onClick={() => zoomBy(1 / ZOOM_STEP)}
              >
                <MdZoomOut size={ICON + 2} />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title="Reset to 100% (1)">
            <span>
              <Button
                size="small"
                disabled={disabled}
                onClick={zoomReset}
                sx={{
                  minWidth: 60,
                  color: 'text.primary',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {zoom}%
              </Button>
            </span>
          </Tooltip>

          <Tooltip title="Zoom in (+)">
            <span>
              <IconButton
                size="small"
                disabled={disabled}
                onClick={() => zoomBy(ZOOM_STEP)}
              >
                <MdZoomIn size={ICON + 2} />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>

        <Tooltip title="Fit to screen (0)">
          <span>
            <IconButton size="small" disabled={disabled} onClick={handleFit}>
              <MdFitScreen size={ICON + 2} />
            </IconButton>
          </span>
        </Tooltip>

        {layers.length > 1 && (
          <Button
            size="small"
            color="inherit"
            disabled={disabled}
            startIcon={<MdLayers size={ICON} />}
            endIcon={<MdKeyboardArrowDown size={ICON} />}
            onClick={(event) => setLayersAnchor(event.currentTarget)}
          >
            Layers
          </Button>
        )}

        <Box sx={{ flex: 1 }} />

        <Tooltip title={fullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}>
          <span>
            <IconButton size="small" disabled={disabled} onClick={toggleFullscreen}>
              {fullscreen ? (
                <MdFullscreenExit size={ICON + 2} />
              ) : (
                <MdFullscreen size={ICON + 2} />
              )}
            </IconButton>
          </span>
        </Tooltip>

        <Button
          variant="contained"
          size="small"
          disabled={disabled || exporting}
          startIcon={
            exporting ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <MdFileDownload size={ICON} />
            )
          }
          endIcon={<MdKeyboardArrowDown size={ICON} />}
          onClick={(event) => setExportAnchor(event.currentTarget)}
        >
          {exporting ? 'Exporting…' : 'Export'}
        </Button>
      </Box>

      {/* Diagram area */}
      <Box
        ref={areaRef}
        onMouseDown={() => rootRef.current?.focus()}
        sx={(theme) => ({
          position: 'relative',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          backgroundImage: `radial-gradient(${alpha(
            theme.palette.text.primary,
            0.14,
          )} 1px, transparent 1px)`,
          backgroundSize: '20px 20px',

          // Make the draw.io viewer fill the whole area.
          '& .mxgraph': {
            display: 'block !important',
            width: '100% !important',
            height: '100% !important',
            maxWidth: 'none !important',
            border: '0 !important',
            overflow: 'hidden !important',
          },
          '& .geDiagramContainer': {
            display: 'block !important',
            width: '100% !important',
            height: '100% !important',
            margin: '0 !important',
            overflow: 'auto !important',
            boxSizing: 'border-box',
            background: 'transparent !important',
          },
        })}
      >
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 2,
              zIndex: 2,
              bgcolor: 'background.default',
            }}
          >
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">
              Loading diagram...
            </Typography>
          </Box>
        )}

        {error && (
          <Box sx={{ p: 3 }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        )}

        {/* Always mounted so a new src can render after an error. */}
        <div
          ref={diagramRef}
          style={{
            width: '100%',
            height: '100%',
            display: error ? 'none' : 'block',
          }}
        />
      </Box>

      {/* Page tabs (multi-page diagrams only) */}
      {pages.length > 1 && (
        <Box
          sx={{
            borderTop: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Tabs
            value={Math.min(pageIndex, pages.length - 1)}
            onChange={handlePageChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 36,
              '& .MuiTab-root': {
                minHeight: 36,
                py: 0,
                textTransform: 'none',
              },
            }}
          >
            {pages.map((name, index) => (
              <Tab key={`${name}-${index}`} label={name} />
            ))}
          </Tabs>
        </Box>
      )}

      {/* Export menu */}
      <Menu
        anchorEl={exportAnchor}
        open={Boolean(exportAnchor)}
        onClose={() => setExportAnchor(null)}
        container={menuContainer}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={() => void handleExport('png')}>
          <ListItemIcon>
            <MdOutlineImage size={ICON + 2} />
          </ListItemIcon>
          <ListItemText>Save as PNG</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => void handleExport('pdf')}>
          <ListItemIcon>
            <MdOutlinePictureAsPdf size={ICON + 2} />
          </ListItemIcon>
          <ListItemText>Save as PDF</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => void handleExport('svg')}>
          <ListItemIcon>
            <MdCode size={ICON + 2} />
          </ListItemIcon>
          <ListItemText>Save as SVG</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => void handleExport('copy')}>
          <ListItemIcon>
            <MdContentCopy size={ICON + 2} />
          </ListItemIcon>
          <ListItemText>Copy image</ListItemText>
        </MenuItem>
      </Menu>

      {/* Layers menu */}
      <Menu
        anchorEl={layersAnchor}
        open={Boolean(layersAnchor)}
        onClose={() => setLayersAnchor(null)}
        container={menuContainer}
      >
        {layers.map((layer, index) => (
          <MenuItem key={`${layer.name}-${index}`} onClick={() => toggleLayer(index)}>
            <ListItemIcon>
              <Checkbox
                edge="start"
                size="small"
                checked={layer.visible}
                tabIndex={-1}
                disableRipple
              />
            </ListItemIcon>
            <ListItemText>{layer.name}</ListItemText>
          </MenuItem>
        ))}
      </Menu>

      {/* Feedback */}
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert
            severity={toast.severity}
            variant="filled"
            onClose={() => setToast(null)}
          >
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}