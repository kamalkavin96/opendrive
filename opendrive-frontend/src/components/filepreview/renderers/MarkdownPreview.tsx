import { useCallback, useEffect, useMemo, useRef, useState, isValidElement } from 'react';
import type { ReactNode } from 'react';
import {
    Alert,
    alpha,
    Box,
    Button,
    CircularProgress,
    Dialog,
    Divider,
    GlobalStyles,
    IconButton,
    InputBase,
    LinearProgress,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Popover,
    Slider,
    Snackbar,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material';

import {
    MdArrowUpward,
    MdCheck,
    MdClose,
    MdCode,
    MdContentCopy,
    MdDescription,
    MdFileDownload,
    MdFullscreen,
    MdFullscreenExit,
    MdHtml,
    MdKeyboardArrowDown,
    MdKeyboardArrowUp,
    MdNotes,
    MdPictureAsPdf,
    MdPrint,
    MdSearch,
    MdToc,
    MdTune,
    MdVerticalSplit,
    MdVisibility,
} from 'react-icons/md';

import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import type { PreviewProps } from '../previewTypes';
import { MAX_TEXT_BYTES, useTextContent } from '../previews/useTextContent';

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type ViewMode = 'preview' | 'source' | 'split';
type Paper = 'light' | 'sepia' | 'dark';
type PageWidth = 'narrow' | 'normal' | 'wide' | 'full';
type FontFamily = 'sans' | 'serif' | 'mono';

interface Prefs {
    paper: Paper;
    width: PageWidth;
    fontSize: number;
    fontFamily: FontFamily;
    outline: boolean;
}

interface Heading {
    text: string;
    level: number;
}

interface ToastState {
    severity: 'success' | 'error';
    message: string;
}

interface PaperColors {
    bg: string;
    fg: string;
    muted: string;
    border: string;
    codeBg: string;
    inlineCodeBg: string;
    link: string;
    headBg: string;
}

interface MdNode {
    type: string;
    value?: string;
    children?: MdNode[];
    data?: Record<string, unknown>;
}

interface HighlightLike {
    priority: number;
}

interface HighlightRegistry {
    set: (name: string, highlight: unknown) => void;
    delete: (name: string) => void;
}

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const ICON = 18;
const CHROME_BG = '#2b2b2b';
const MAX_MATCHES = 2000;
const PREFS_KEY = 'markdown-preview:prefs';

const DEFAULT_PREFS: Prefs = {
    paper: 'light',
    width: 'normal',
    fontSize: 15,
    fontFamily: 'sans',
    outline: true,
};

const PAPERS: Record<Paper, PaperColors> = {
    light: {
        bg: '#ffffff',
        fg: '#1f2328',
        muted: '#59636e',
        border: '#d0d7de',
        codeBg: '#f6f8fa',
        inlineCodeBg: '#eff1f3',
        link: '#0969da',
        headBg: '#f6f8fa',
    },
    sepia: {
        bg: '#f4ecd8',
        fg: '#433422',
        muted: '#7a6a55',
        border: '#d9ccae',
        codeBg: '#ebe1c8',
        inlineCodeBg: '#e6dbc0',
        link: '#8a4b08',
        headBg: '#ebe1c8',
    },
    dark: {
        bg: '#1b1d21',
        fg: '#d7dae0',
        muted: '#9aa3b0',
        border: '#3a3f47',
        codeBg: '#14161a',
        inlineCodeBg: '#2a2e35',
        link: '#6cb6ff',
        headBg: '#23262b',
    },
};

const WIDTHS: Record<PageWidth, string> = {
    narrow: '680px',
    normal: '860px',
    wide: '1100px',
    full: 'none',
};

const FONTS: Record<FontFamily, string> = {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    serif: 'Georgia, "Times New Roman", Times, serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
};

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

const CALLOUT_TITLES = {
    note: 'Note',
    tip: 'Tip',
    important: 'Important',
    warning: 'Warning',
    caution: 'Caution',
} as const;

const CALLOUT_COLORS: Record<keyof typeof CALLOUT_TITLES, string> = {
    note: '#0969da',
    tip: '#1a7f37',
    important: '#8250df',
    warning: '#9a6700',
    caution: '#cf222e',
};

/* -------------------------------------------------------------------------- */
/* Export / print document                                                    */
/* -------------------------------------------------------------------------- */

const DOC_CSS = `
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
    ul.contains-task-list { list-style: none; padding-left: 1.2em; }
    .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); }
    section[data-footnotes] { margin-top: 2em; border-top: 1px solid #ccc; font-size: 90%; }
    blockquote.callout { color: #000; border-left-width: 4px; border-radius: 4px; padding: 0.5em 1em; background: #f6f8fa; }
    .callout-title { font-weight: 700; margin: 0 0 0.4em; }
    blockquote.callout-note { border-left-color: #0969da; }
    blockquote.callout-tip { border-left-color: #1a7f37; }
    blockquote.callout-important { border-left-color: #8250df; }
    blockquote.callout-warning { border-left-color: #9a6700; }
    blockquote.callout-caution { border-left-color: #cf222e; }
    @media print {
        a[href^="http"]::after { content: " (" attr(href) ")"; font-size: 85%; color: #555; word-break: break-all; }
    }
`;

const SCREEN_CSS = `
    @media screen {
        body { max-width: 860px; margin: 0 auto; padding: 32px 24px; }
    }
`;

const escapeHtml = (value: string): string =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

function buildDocument(title: string, body: string, kind: 'print' | 'html' | 'word'): string {
    const head =
        `<meta charset="utf-8"><title>${escapeHtml(title)}</title>` +
        `<style>${DOC_CSS}${kind === 'html' ? SCREEN_CSS : ''}</style>`;

    if (kind === 'word') {
        return (
            '<!doctype html><html xmlns:o="urn:schemas-microsoft-com:office:office" ' +
            'xmlns:w="urn:schemas-microsoft-com:office:word" ' +
            'xmlns="http://www.w3.org/TR/REC-html40">' +
            `<head>${head}</head><body>${body}</body></html>`
        );
    }

    return `<!doctype html><html><head>${head}</head><body>${body}</body></html>`;
}

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

/* -------------------------------------------------------------------------- */
/* Markdown helpers                                                           */
/* -------------------------------------------------------------------------- */

/** Pulls a simple `key: value` YAML front matter block off the top of the file. */
function splitFrontMatter(source: string): { meta: [string, string][] | null; body: string } {
    const match = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(source);

    if (!match) return { meta: null, body: source };

    const meta = match[1]
        .split(/\r?\n/)
        .map((line): [string, string] | null => {
            const index = line.indexOf(':');

            if (index <= 0 || /^\s/.test(line)) return null;

            return [
                line.slice(0, index).trim(),
                line
                    .slice(index + 1)
                    .trim()
                    .replace(/^["']|["']$/g, ''),
            ];
        })
        .filter((entry): entry is [string, string] => entry !== null);

    if (meta.length === 0) return { meta: null, body: source };

    return { meta, body: source.slice(match[0].length) };
}

/** Turns `> [!NOTE]` style blockquotes into callouts. */
function visitCallouts(node: MdNode) {
    if (node.type === 'blockquote' && node.children?.length) {
        const first = node.children[0];
        const textNode = first.type === 'paragraph' ? first.children?.[0] : undefined;

        const match =
            textNode?.type === 'text' && textNode.value
                ? /^\s*\[!(note|tip|important|warning|caution)\][ \t]*\r?\n?/i.exec(textNode.value)
                : null;

        if (match && textNode && textNode.value !== undefined && first.children) {
            const kind = match[1].toLowerCase() as keyof typeof CALLOUT_TITLES;

            textNode.value = textNode.value.slice(match[0].length);

            if (!textNode.value) first.children.shift();

            const rest = first.children.length ? node.children : node.children.slice(1);

            node.children = [
                {
                    type: 'paragraph',
                    data: { hProperties: { className: ['callout-title'] } },
                    children: [{ type: 'text', value: CALLOUT_TITLES[kind] }],
                },
                ...rest,
            ];

            node.data = {
                ...node.data,
                hProperties: { className: ['callout', `callout-${kind}`] },
            };
        }
    }

    node.children?.forEach(visitCallouts);
}

function remarkCallouts() {
    return (tree: unknown) => visitCallouts(tree as MdNode);
}

const slugify = (value: string): string =>
    value
        .toLowerCase()
        .trim()
        .replace(/[^\p{L}\p{N}\s-]/gu, '')
        .replace(/\s+/g, '-');

function getNodeText(node: ReactNode): string {
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(getNodeText).join('');
    if (isValidElement(node)) {
        return getNodeText((node.props as { children?: ReactNode }).children);
    }
    return '';
}

function getNodeLanguage(node: ReactNode): string {
    if (Array.isArray(node)) return getNodeLanguage(node[0] as ReactNode);

    if (isValidElement(node)) {
        const className = (node.props as { className?: string }).className ?? '';
        const match = /language-([\w+-]+)/.exec(className);

        return match ? match[1] : '';
    }

    return '';
}

function CodeBlock({
    children,
    onCopy,
}: Readonly<{ children?: ReactNode; onCopy: (text: string) => Promise<boolean> }>) {
    const [copied, setCopied] = useState(false);

    const language = getNodeLanguage(children);
    const code = getNodeText(children).replace(/\n$/, '');

    const handleCopy = async () => {
        if (await onCopy(code)) {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
        }
    };

    return (
        <div className="code-block">
            <div className="code-bar" data-no-export="true" data-no-search="true">
                <span>{language || 'text'}</span>
                <button type="button" onClick={() => void handleCopy()}>
                    {copied ? <MdCheck size={14} /> : <MdContentCopy size={14} />}
                    {copied ? 'Copied' : 'Copy'}
                </button>
            </div>
            <pre>{children}</pre>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Misc helpers                                                               */
/* -------------------------------------------------------------------------- */

function loadPrefs(): Prefs {
    try {
        const raw = localStorage.getItem(PREFS_KEY);

        if (raw) return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Prefs>) };
    } catch {
        // ignore storage / parse errors
    }

    return DEFAULT_PREFS;
}

/** CSS Custom Highlight API (used for find-in-page). Null where unsupported. */
function getHighlights(): {
    registry: HighlightRegistry;
    create: (...ranges: Range[]) => HighlightLike;
} | null {
    const registry = (CSS as unknown as { highlights?: HighlightRegistry }).highlights;
    const Ctor = (window as unknown as { Highlight?: new (...ranges: Range[]) => HighlightLike })
        .Highlight;

    if (!registry || !Ctor) return null;

    return { registry, create: (...ranges) => new Ctor(...ranges) };
}

function buildDocSx(paper: PaperColors, prefs: Prefs): SxProps<Theme> {
    const calloutRules = Object.fromEntries(
        Object.entries(CALLOUT_COLORS).flatMap(([kind, color]) => [
            [
                `& blockquote.callout-${kind}`,
                { borderLeftColor: color, bgcolor: alpha(color, 0.1) },
            ],
            [`& blockquote.callout-${kind} > .callout-title`, { color }],
        ]),
    );

    return {
        maxWidth: WIDTHS[prefs.width],
        mx: 'auto',
        p: { xs: 2, sm: 5 },
        bgcolor: paper.bg,
        color: paper.fg,
        fontSize: prefs.fontSize,
        lineHeight: 1.7,
        fontFamily: FONTS[prefs.fontFamily],
        wordBreak: 'break-word',
        borderRadius: prefs.width === 'full' ? 0 : 1,
        boxShadow: prefs.width === 'full' ? 'none' : '0 2px 14px rgba(0,0,0,0.35)',

        '& h1, & h2, & h3, & h4, & h5, & h6': {
            lineHeight: 1.25,
            mt: 3.5,
            mb: 1.5,
            scrollMarginTop: '16px',
        },
        '& > div > :first-child': { mt: 0 },
        '& h1': { fontSize: '2em', borderBottom: `1px solid ${paper.border}`, pb: 0.5 },
        '& h2': { fontSize: '1.5em', borderBottom: `1px solid ${paper.border}`, pb: 0.5 },
        '& h3': { fontSize: '1.25em' },
        '& h4': { fontSize: '1.05em' },
        '& p, & ul, & ol, & blockquote, & .code-block, & .table-wrap': { mt: 0, mb: 2 },
        '& ul, & ol': { pl: 3 },
        '& li + li': { mt: 0.5 },
        '& a': { color: paper.link },
        '& img': { maxWidth: '100%', borderRadius: '6px', cursor: 'zoom-in' },
        '& blockquote': {
            m: 0,
            mb: 2,
            px: 2,
            color: paper.muted,
            borderLeft: `4px solid ${paper.border}`,
        },
        '& blockquote.callout': {
            px: 2,
            py: 1,
            color: 'inherit',
            borderLeftWidth: '4px',
            borderLeftStyle: 'solid',
            borderRadius: '6px',
            '& > :last-child': { mb: 0 },
        },
        '& .callout-title': { fontWeight: 700, mb: 0.5 },
        ...calloutRules,

        '& :not(pre) > code': {
            px: '0.35em',
            py: '0.15em',
            bgcolor: paper.inlineCodeBg,
            borderRadius: '4px',
            fontSize: '85%',
            fontFamily: MONO,
        },
        '& .code-block': {
            border: `1px solid ${paper.border}`,
            borderRadius: '8px',
            overflow: 'hidden',
            bgcolor: paper.codeBg,
        },
        '& .code-bar': {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 1.5,
            py: 0.5,
            fontSize: 12,
            fontFamily: MONO,
            color: paper.muted,
            borderBottom: `1px solid ${paper.border}`,
            '& button': {
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                border: 0,
                borderRadius: '4px',
                px: 0.75,
                py: 0.25,
                fontSize: 12,
                color: 'inherit',
                bgcolor: 'transparent',
                cursor: 'pointer',
                '&:hover': { bgcolor: alpha(paper.fg, 0.1), color: paper.fg },
            },
        },
        '& .code-block pre': {
            m: 0,
            p: 2,
            overflow: 'auto',
            fontSize: '0.88em',
            lineHeight: 1.55,
            fontFamily: MONO,
        },
        '& .code-block pre code': { p: 0, bgcolor: 'transparent', fontSize: 'inherit' },

        '& .table-wrap': { overflow: 'auto' },
        '& table': { borderCollapse: 'collapse', width: 'max-content', minWidth: '100%' },
        '& th, & td': { border: `1px solid ${paper.border}`, px: 1.5, py: 0.75 },
        '& th': { bgcolor: paper.headBg, textAlign: 'left' },
        '& tbody tr:nth-of-type(even)': { bgcolor: alpha(paper.fg, 0.035) },

        '& ul.contains-task-list': { listStyle: 'none', pl: 2 },
        '& li.task-list-item input': { mr: 1 },
        '& hr': { border: 0, borderTop: `1px solid ${paper.border}`, my: 3 },
        '& .sr-only': {
            position: 'absolute',
            width: 1,
            height: 1,
            overflow: 'hidden',
            clip: 'rect(0 0 0 0)',
        },
        '& section[data-footnotes]': {
            mt: 4,
            pt: 1,
            borderTop: `1px solid ${paper.border}`,
            fontSize: '0.9em',
            color: paper.muted,
        },
        '& .front-matter': {
            display: 'grid',
            gridTemplateColumns: 'max-content 1fr',
            columnGap: 2,
            rowGap: 0.5,
            p: 1.5,
            mb: 3,
            fontSize: '0.85em',
            bgcolor: paper.codeBg,
            border: `1px solid ${paper.border}`,
            borderRadius: '8px',
            '& dt': { color: paper.muted, fontFamily: MONO },
            '& dd': { m: 0 },
        },
    };
}

const toolbarButtonSx: SxProps<Theme> = {
    color: '#fff',
    '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
    '&.Mui-disabled': { color: 'rgba(255,255,255,0.3)' },
};

const toolbarToggleSx: SxProps<Theme> = {
    '& .MuiToggleButton-root': {
        color: 'rgba(255,255,255,0.8)',
        borderColor: 'rgba(255,255,255,0.2)',
        textTransform: 'none',
        px: 1,
        py: 0.25,
    },
    '& .MuiToggleButton-root.Mui-selected': {
        color: '#fff',
        bgcolor: 'rgba(255,255,255,0.2)',
    },
    '& .MuiToggleButton-root:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
};

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function MarkdownPreview({ file, src }: Readonly<PreviewProps>) {
    const { loading, error, text, truncated } = useTextContent(src);

    const rootRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const previewScrollRef = useRef<HTMLDivElement>(null);
    const sourceScrollRef = useRef<HTMLDivElement>(null);
    const sourceRef = useRef<HTMLPreElement>(null);
    const tocRef = useRef<HTMLDivElement>(null);
    const findInputRef = useRef<HTMLInputElement>(null);
    const headingElsRef = useRef<HTMLElement[]>([]);
    const rangesRef = useRef<Range[]>([]);
    const rafRef = useRef(0);

    const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
    const [mode, setMode] = useState<ViewMode>('preview');
    const [headings, setHeadings] = useState<Heading[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [showTop, setShowTop] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [toast, setToast] = useState<ToastState | null>(null);
    const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

    const [findOpen, setFindOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [matchCount, setMatchCount] = useState(0);
    const [matchIndex, setMatchIndex] = useState(0);

    const [copyAnchor, setCopyAnchor] = useState<HTMLElement | null>(null);
    const [exportAnchor, setExportAnchor] = useState<HTMLElement | null>(null);
    const [displayAnchor, setDisplayAnchor] = useState<HTMLElement | null>(null);

    const { meta, body } = useMemo(() => splitFrontMatter(text), [text]);

    const stats = useMemo(() => {
        const trimmed = body.trim();
        const words = trimmed ? trimmed.split(/\s+/).length : 0;

        return {
            words,
            chars: body.length,
            lines: text ? text.split('\n').length : 0,
            minutes: Math.max(1, Math.ceil(words / 220)),
        };
    }, [body, text]);

    const lineNumbers = useMemo(
        () => Array.from({ length: stats.lines }, (_, index) => index + 1).join('\n'),
        [stats.lines],
    );

    const baseName = useMemo(
        () => file.fileName.replace(/\.[^.]+$/, '') || 'document',
        [file.fileName],
    );

    const paper = PAPERS[prefs.paper];
    const docSx = useMemo(() => buildDocSx(paper, prefs), [paper, prefs]);

    const showPreview = mode !== 'source';
    const showSource = mode !== 'preview';

    /* ---- persisted preferences ---- */

    useEffect(() => {
        try {
            localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
        } catch {
            // ignore storage errors
        }
    }, [prefs]);

    const updatePrefs = (patch: Partial<Prefs>) => setPrefs((previous) => ({ ...previous, ...patch }));

    /* ---- clipboard / export content ---- */

    const copyText = useCallback(async (value: string): Promise<boolean> => {
        try {
            await navigator.clipboard.writeText(value);
            return true;
        } catch {
            setToast({ severity: 'error', message: 'Unable to copy to the clipboard.' });
            return false;
        }
    }, []);

    /** Rendered HTML without UI-only elements (code toolbars, etc.). */
    const getCleanHtml = useCallback((): string => {
        const node = contentRef.current;

        if (!node) return '';

        const clone = node.cloneNode(true) as HTMLElement;

        clone.querySelectorAll('[data-no-export]').forEach((element) => element.remove());

        return clone.innerHTML;
    }, []);

    const getPlainText = useCallback((): string => {
        const holder = document.createElement('div');

        holder.style.cssText = 'position:fixed;left:-99999px;top:0;width:800px;';
        holder.innerHTML = getCleanHtml();
        document.body.appendChild(holder);

        const value = holder.innerText;

        holder.remove();

        return value.replace(/\n{3,}/g, '\n\n').trim();
    }, [getCleanHtml]);

    const handleCopy = async (kind: 'md' | 'html' | 'txt' | 'rich') => {
        setCopyAnchor(null);

        if (kind === 'rich') {
            try {
                if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
                    throw new Error('unsupported');
                }

                await navigator.clipboard.write([
                    new ClipboardItem({
                        'text/html': new Blob([getCleanHtml()], { type: 'text/html' }),
                        'text/plain': new Blob([getPlainText()], { type: 'text/plain' }),
                    }),
                ]);

                setToast({ severity: 'success', message: 'Formatted text copied.' });
            } catch {
                setToast({
                    severity: 'error',
                    message: 'Copying formatted text is not supported in this browser.',
                });
            }

            return;
        }

        const value = kind === 'md' ? text : kind === 'html' ? getCleanHtml() : getPlainText();
        const label = kind === 'md' ? 'Markdown' : kind === 'html' ? 'HTML' : 'Plain text';

        if (await copyText(value)) {
            setToast({ severity: 'success', message: `${label} copied.` });
        }
    };

    const handleExport = (kind: 'md' | 'html' | 'doc' | 'txt') => {
        setExportAnchor(null);

        try {
            if (kind === 'md') {
                downloadBlob(
                    new Blob([text], { type: 'text/markdown;charset=utf-8' }),
                    `${baseName}.md`,
                );
            } else if (kind === 'html') {
                downloadBlob(
                    new Blob([buildDocument(baseName, getCleanHtml(), 'html')], {
                        type: 'text/html;charset=utf-8',
                    }),
                    `${baseName}.html`,
                );
            } else if (kind === 'doc') {
                downloadBlob(
                    new Blob(['\ufeff', buildDocument(baseName, getCleanHtml(), 'word')], {
                        type: 'application/msword',
                    }),
                    `${baseName}.doc`,
                );
            } else {
                downloadBlob(
                    new Blob([getPlainText()], { type: 'text/plain;charset=utf-8' }),
                    `${baseName}.txt`,
                );
            }

            setToast({ severity: 'success', message: 'Export started.' });
        } catch (err) {
            console.error('Markdown export error:', err);
            setToast({ severity: 'error', message: 'Unable to export this document.' });
        }
    };

    const handlePrint = useCallback(() => {
        setExportAnchor(null);

        if (!contentRef.current) return;

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

        iframe.srcdoc = buildDocument(file.fileName, getCleanHtml(), 'print');

        document.body.appendChild(iframe);
    }, [file.fileName, getCleanHtml]);

    /* ---- outline (headings) ---- */

    const scrollToId = useCallback((id: string) => {
        const root = contentRef.current;

        if (!root) return;

        const all = Array.from(root.querySelectorAll<HTMLElement>('[id]'));
        const target = all.find((el) => el.id === id) ?? all.find((el) => el.id === slugify(id));

        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, []);

    const updateActive = useCallback(() => {
        const scroller = previewScrollRef.current;
        const elements = headingElsRef.current;

        if (!scroller || elements.length === 0) return;

        const limit = scroller.getBoundingClientRect().top + 32;
        let index = 0;

        for (let i = 0; i < elements.length; i += 1) {
            if (elements[i].getBoundingClientRect().top <= limit) {
                index = i;
            } else {
                break;
            }
        }

        if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2) {
            index = elements.length - 1;
        }

        setActiveIndex(index);
    }, []);

    useEffect(() => {
        const root = contentRef.current;

        if (!root) {
            headingElsRef.current = [];
            setHeadings([]);
            return;
        }

        const used = new Map<string, number>();
        const elements: HTMLElement[] = [];
        const list: Heading[] = [];

        root.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6').forEach((heading) => {
            const label = (heading.textContent ?? '').trim();

            if (!label || heading.classList.contains('sr-only')) return;

            const base = slugify(label) || 'section';
            const count = used.get(base) ?? 0;

            used.set(base, count + 1);

            heading.id = count ? `${base}-${count}` : base;

            elements.push(heading);
            list.push({ text: label, level: Number(heading.tagName[1]) });
        });

        headingElsRef.current = elements;
        setHeadings(list);
        updateActive();
    }, [body, loading, updateActive]);

    const minLevel = useMemo(
        () => (headings.length ? Math.min(...headings.map((heading) => heading.level)) : 1),
        [headings],
    );

    // Keep the active outline item visible.
    useEffect(() => {
        const box = tocRef.current;
        const item = box?.querySelector<HTMLElement>('[data-active="true"]');

        if (!box || !item) return;

        if (item.offsetTop < box.scrollTop + 40 || item.offsetTop > box.scrollTop + box.clientHeight - 60) {
            box.scrollTop = item.offsetTop - box.clientHeight / 3;
        }
    }, [activeIndex]);

    const goToHeading = (index: number) => {
        const element = headingElsRef.current[index];

        if (!element) return;

        if (mode === 'source') {
            setMode('preview');
            window.setTimeout(() => element.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
        } else {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    /* ---- scroll progress ---- */

    const syncScroll = useCallback((element: HTMLElement | null) => {
        if (!element) return;

        const max = element.scrollHeight - element.clientHeight;

        setProgress(max > 0 ? (element.scrollTop / max) * 100 : 0);
        setShowTop(element.scrollTop > 400);
    }, []);

    const handlePreviewScroll = useCallback(() => {
        if (rafRef.current) return;

        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = 0;
            syncScroll(previewScrollRef.current);
            updateActive();
        });
    }, [syncScroll, updateActive]);

    useEffect(() => {
        const id = requestAnimationFrame(() => {
            syncScroll(mode === 'source' ? sourceScrollRef.current : previewScrollRef.current);
            updateActive();
        });

        return () => cancelAnimationFrame(id);
    }, [mode, body, loading, syncScroll, updateActive]);

    const scrollToTop = () => {
        const scroller = mode === 'source' ? sourceScrollRef.current : previewScrollRef.current;

        scroller?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    /* ---- find in document ---- */

    const openFind = useCallback(() => {
        const selected = window.getSelection()?.toString().trim() ?? '';

        if (selected && selected.length < 80 && !selected.includes('\n')) {
            setQuery(selected);
        }

        setFindOpen(true);
        window.setTimeout(() => {
            findInputRef.current?.focus();
            findInputRef.current?.select();
        }, 0);
    }, []);

    const closeFind = () => setFindOpen(false);

    const goMatch = (delta: number) => {
        if (matchCount === 0) return;

        setMatchIndex((index) => (index + delta + matchCount) % matchCount);
    };

    useEffect(() => {
        const highlights = getHighlights();
        const root = mode === 'source' ? sourceRef.current : contentRef.current;

        rangesRef.current = [];
        highlights?.registry.delete('md-search');
        highlights?.registry.delete('md-search-current');

        if (!findOpen || !query || !root) {
            setMatchCount(0);
            setMatchIndex(0);
            return;
        }

        const needle = query.toLowerCase();
        const ranges: Range[] = [];

        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode: (node) =>
                node.parentElement?.closest('[data-no-search]')
                    ? NodeFilter.FILTER_REJECT
                    : NodeFilter.FILTER_ACCEPT,
        });

        let node = walker.nextNode();

        while (node && ranges.length < MAX_MATCHES) {
            const haystack = (node.nodeValue ?? '').toLowerCase();
            let from = 0;

            while (ranges.length < MAX_MATCHES) {
                const index = haystack.indexOf(needle, from);

                if (index < 0) break;

                const range = document.createRange();

                range.setStart(node, index);
                range.setEnd(node, index + needle.length);
                ranges.push(range);
                from = index + needle.length;
            }

            node = walker.nextNode();
        }

        rangesRef.current = ranges;
        setMatchCount(ranges.length);
        setMatchIndex(0);

        if (highlights && ranges.length) {
            highlights.registry.set('md-search', highlights.create(...ranges));
        }
    }, [findOpen, query, mode, body, loading]);

    useEffect(() => {
        const highlights = getHighlights();
        const range = rangesRef.current[matchIndex];

        highlights?.registry.delete('md-search-current');

        if (!findOpen || !range) return;

        if (highlights) {
            const current = highlights.create(range);

            current.priority = 1;
            highlights.registry.set('md-search-current', current);
        }

        range.startContainer.parentElement?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, [matchIndex, matchCount, query, findOpen, mode, body]);

    useEffect(
        () => () => {
            const highlights = getHighlights();

            highlights?.registry.delete('md-search');
            highlights?.registry.delete('md-search-current');
        },
        [],
    );

    /* ---- global shortcuts ---- */

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (!contentRef.current || !(event.ctrlKey || event.metaKey)) return;

            const key = event.key.toLowerCase();

            if (key === 'p') {
                event.preventDefault();
                handlePrint();
            } else if (key === 'f') {
                event.preventDefault();
                openFind();
            }
        };

        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [handlePrint, openFind]);

    /* ---- fullscreen ---- */

    useEffect(() => {
        const onChange = () => setFullscreen(document.fullscreenElement === rootRef.current);

        document.addEventListener('fullscreenchange', onChange);

        return () => document.removeEventListener('fullscreenchange', onChange);
    }, []);

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

    /* ---- markdown components (kept stable so the tree is not remounted) ---- */

    const components = useMemo(
        () => ({
            a: ({ href, children }: { href?: string; children?: ReactNode }) => {
                if (href?.startsWith('#')) {
                    return (
                        <a
                            href={href}
                            onClick={(event) => {
                                event.preventDefault();

                                try {
                                    scrollToId(decodeURIComponent(href.slice(1)));
                                } catch {
                                    scrollToId(href.slice(1));
                                }
                            }}
                        >
                            {children}
                        </a>
                    );
                }

                return (
                    <a href={href} target="_blank" rel="noopener noreferrer">
                        {children}
                    </a>
                );
            },
            img: ({ src: imageSrc, alt }: { src?: unknown; alt?: string }) =>
                typeof imageSrc === 'string' ? (
                    <img
                        src={imageSrc}
                        alt={alt ?? ''}
                        loading="lazy"
                        onClick={() => setLightbox({ src: imageSrc, alt: alt ?? '' })}
                    />
                ) : null,
            pre: ({ children }: { children?: ReactNode }) => (
                <CodeBlock onCopy={copyText}>{children}</CodeBlock>
            ),
            table: ({ children }: { children?: ReactNode }) => (
                <div className="table-wrap">
                    <table>{children}</table>
                </div>
            ),
        }),
        [scrollToId, copyText],
    );

    /* ---- early states ---- */

    if (loading) {
        return (
            <Box
                sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: CHROME_BG,
                }}
            >
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

    const menuContainer = () => rootRef.current;

    const copyItems = [
        { key: 'rich' as const, icon: <MdDescription size={ICON + 2} />, label: 'Copy formatted text' },
        { key: 'md' as const, icon: <MdCode size={ICON + 2} />, label: 'Copy as Markdown' },
        { key: 'html' as const, icon: <MdHtml size={ICON + 2} />, label: 'Copy as HTML' },
        { key: 'txt' as const, icon: <MdNotes size={ICON + 2} />, label: 'Copy as plain text' },
    ];

    const exportItems = [
        { key: 'md' as const, icon: <MdCode size={ICON + 2} />, label: 'Markdown (.md)' },
        { key: 'html' as const, icon: <MdHtml size={ICON + 2} />, label: 'HTML page (.html)' },
        { key: 'doc' as const, icon: <MdDescription size={ICON + 2} />, label: 'Word document (.doc)' },
        { key: 'txt' as const, icon: <MdNotes size={ICON + 2} />, label: 'Plain text (.txt)' },
    ];

    const splitView = mode === 'split';

    return (
        <Box
            ref={rootRef}
            sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                bgcolor: CHROME_BG,
            }}
        >
            <GlobalStyles
                styles={{
                    '::highlight(md-search)': {
                        backgroundColor: 'rgba(255, 213, 0, 0.45)',
                        color: 'inherit',
                    },
                    '::highlight(md-search-current)': {
                        backgroundColor: '#ff9632',
                        color: '#000',
                    },
                }}
            />

            {/* Toolbar */}
            <Box
                sx={{
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 1,
                    px: 1,
                    py: 0.5,
                    bgcolor: 'rgba(15,15,15,0.95)',
                    borderBottom: '1px solid rgba(255,255,255,0.12)',
                }}
            >
                <Tooltip title={prefs.outline ? 'Hide outline' : 'Show outline'}>
                    <IconButton
                        size="small"
                        aria-label="Toggle outline"
                        onClick={() => updatePrefs({ outline: !prefs.outline })}
                        sx={{
                            ...toolbarButtonSx,
                            bgcolor: prefs.outline ? 'rgba(255,255,255,0.18)' : 'transparent',
                        }}
                    >
                        <MdToc size={ICON + 2} />
                    </IconButton>
                </Tooltip>

                <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={mode}
                    onChange={(_event, value: ViewMode | null) => value && setMode(value)}
                    sx={toolbarToggleSx}
                >
                    <ToggleButton value="preview" title="Preview" aria-label="Preview">
                        <MdVisibility size={16} />
                        <Box component="span" sx={{ ml: 0.5, display: { xs: 'none', md: 'inline' } }}>
                            Preview
                        </Box>
                    </ToggleButton>
                    <ToggleButton value="source" title="Source" aria-label="Source">
                        <MdCode size={16} />
                        <Box component="span" sx={{ ml: 0.5, display: { xs: 'none', md: 'inline' } }}>
                            Source
                        </Box>
                    </ToggleButton>
                    <ToggleButton value="split" title="Split view" aria-label="Split view">
                        <MdVerticalSplit size={16} />
                        <Box component="span" sx={{ ml: 0.5, display: { xs: 'none', md: 'inline' } }}>
                            Split
                        </Box>
                    </ToggleButton>
                </ToggleButtonGroup>

                <Tooltip title="Find (Ctrl/⌘ + F)">
                    <IconButton size="small" aria-label="Find" onClick={openFind} sx={toolbarButtonSx}>
                        <MdSearch size={ICON + 2} />
                    </IconButton>
                </Tooltip>

                <Box sx={{ flex: 1 }} />

                <Tooltip title="Display settings">
                    <IconButton
                        size="small"
                        aria-label="Display settings"
                        onClick={(event) => setDisplayAnchor(event.currentTarget)}
                        sx={toolbarButtonSx}
                    >
                        <MdTune size={ICON + 2} />
                    </IconButton>
                </Tooltip>

                <Tooltip title="Copy">
                    <IconButton
                        size="small"
                        aria-label="Copy"
                        onClick={(event) => setCopyAnchor(event.currentTarget)}
                        sx={toolbarButtonSx}
                    >
                        <MdContentCopy size={ICON + 2} />
                    </IconButton>
                </Tooltip>

                <Tooltip title="Print (Ctrl/⌘ + P)">
                    <IconButton size="small" aria-label="Print" onClick={handlePrint} sx={toolbarButtonSx}>
                        <MdPrint size={ICON + 2} />
                    </IconButton>
                </Tooltip>

                <Tooltip title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
                    <IconButton
                        size="small"
                        aria-label="Fullscreen"
                        onClick={toggleFullscreen}
                        sx={toolbarButtonSx}
                    >
                        {fullscreen ? <MdFullscreenExit size={ICON + 2} /> : <MdFullscreen size={ICON + 2} />}
                    </IconButton>
                </Tooltip>

                <Button
                    variant="contained"
                    size="small"
                    startIcon={<MdFileDownload size={ICON} />}
                    endIcon={<MdKeyboardArrowDown size={ICON} />}
                    onClick={(event) => setExportAnchor(event.currentTarget)}
                    sx={{ textTransform: 'none' }}
                >
                    Export
                </Button>
            </Box>

            <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                    height: 2,
                    flexShrink: 0,
                    bgcolor: 'transparent',
                    '& .MuiLinearProgress-bar': { transition: 'none' },
                }}
            />

            {/* Body */}
            <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
                {/* Outline */}
                {prefs.outline && (
                    <Box
                        sx={{
                            width: 260,
                            flexShrink: 0,
                            display: { xs: 'none', md: 'flex' },
                            flexDirection: 'column',
                            bgcolor: 'rgba(0,0,0,0.25)',
                            borderRight: '1px solid rgba(255,255,255,0.1)',
                        }}
                    >
                        <Typography
                            sx={{
                                px: 2,
                                py: 1,
                                fontSize: 11,
                                letterSpacing: 0.8,
                                textTransform: 'uppercase',
                                color: 'rgba(255,255,255,0.55)',
                            }}
                        >
                            Outline · {headings.length}
                        </Typography>

                        <Box ref={tocRef} sx={{ flex: 1, overflow: 'auto', position: 'relative', pb: 2 }}>
                            {headings.length === 0 ? (
                                <Typography sx={{ px: 2, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                                    No headings in this document.
                                </Typography>
                            ) : (
                                headings.map((heading, index) => (
                                    <Box
                                        key={`${heading.text}-${index}`}
                                        component="button"
                                        type="button"
                                        data-active={index === activeIndex}
                                        onClick={() => goToHeading(index)}
                                        sx={{
                                            display: 'block',
                                            width: '100%',
                                            textAlign: 'left',
                                            border: 0,
                                            borderLeft: '2px solid transparent',
                                            bgcolor: 'transparent',
                                            color: 'rgba(255,255,255,0.7)',
                                            cursor: 'pointer',
                                            font: 'inherit',
                                            fontSize: 13,
                                            lineHeight: 1.4,
                                            py: 0.6,
                                            pr: 1.5,
                                            pl: `${12 + (heading.level - minLevel) * 14}px`,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', color: '#fff' },
                                            '&[data-active="true"]': {
                                                color: '#fff',
                                                bgcolor: 'rgba(255,255,255,0.12)',
                                                borderLeftColor: '#4da3ff',
                                                fontWeight: 600,
                                            },
                                        }}
                                    >
                                        {heading.text}
                                    </Box>
                                ))
                            )}
                        </Box>
                    </Box>
                )}

                {/* Content */}
                <Box sx={{ flex: 1, minWidth: 0, display: 'flex', position: 'relative' }}>
                    {findOpen && (
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 8,
                                right: 20,
                                zIndex: 5,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                pl: 1.5,
                                pr: 0.5,
                                py: 0.25,
                                bgcolor: '#1f1f1f',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: 1.5,
                                boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                            }}
                        >
                            <InputBase
                                inputRef={findInputRef}
                                value={query}
                                placeholder="Find in document"
                                onChange={(event) => setQuery(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        event.preventDefault();
                                        goMatch(event.shiftKey ? -1 : 1);
                                    } else if (event.key === 'Escape') {
                                        closeFind();
                                    }
                                }}
                                sx={{ color: '#fff', fontSize: 14, width: 190 }}
                            />
                            <Typography
                                sx={{
                                    minWidth: 52,
                                    textAlign: 'center',
                                    fontSize: 12,
                                    color: 'rgba(255,255,255,0.65)',
                                    fontVariantNumeric: 'tabular-nums',
                                }}
                            >
                                {query ? (matchCount ? `${matchIndex + 1}/${matchCount}` : '0/0') : ''}
                            </Typography>
                            <IconButton
                                size="small"
                                aria-label="Previous match"
                                disabled={matchCount === 0}
                                onClick={() => goMatch(-1)}
                                sx={toolbarButtonSx}
                            >
                                <MdKeyboardArrowUp size={ICON + 2} />
                            </IconButton>
                            <IconButton
                                size="small"
                                aria-label="Next match"
                                disabled={matchCount === 0}
                                onClick={() => goMatch(1)}
                                sx={toolbarButtonSx}
                            >
                                <MdKeyboardArrowDown size={ICON + 2} />
                            </IconButton>
                            <IconButton size="small" aria-label="Close find" onClick={closeFind} sx={toolbarButtonSx}>
                                <MdClose size={ICON} />
                            </IconButton>
                        </Box>
                    )}

                    {/* Rendered document (kept mounted so outline, export and print always work) */}
                    <Box
                        ref={previewScrollRef}
                        onScroll={handlePreviewScroll}
                        sx={{
                            display: showPreview ? 'block' : 'none',
                            flex: 1,
                            minWidth: 0,
                            overflow: 'auto',
                            p: { xs: 1, sm: 3 },
                            borderRight: splitView ? '1px solid rgba(255,255,255,0.15)' : 0,
                        }}
                    >
                        <Box sx={docSx}>
                            {meta && (
                                <dl className="front-matter" data-no-export="true">
                                    {meta.map(([key, value]) => (
                                        <Box key={key} component="span" sx={{ display: 'contents' }}>
                                            <dt>{key}</dt>
                                            <dd>{value}</dd>
                                        </Box>
                                    ))}
                                </dl>
                            )}

                            {/* Only this node is copied into exports and the printout */}
                            <div ref={contentRef}>
                                <Markdown
                                    remarkPlugins={[remarkGfm, remarkCallouts]}
                                    components={components}
                                >
                                    {body}
                                </Markdown>
                            </div>
                        </Box>
                    </Box>

                    {/* Source */}
                    <Box
                        ref={sourceScrollRef}
                        onScroll={() => syncScroll(sourceScrollRef.current)}
                        sx={{
                            display: showSource ? 'block' : 'none',
                            flex: 1,
                            minWidth: 0,
                            overflow: 'auto',
                            bgcolor: '#1e1f22',
                            color: '#d7dae0',
                        }}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                minWidth: 'max-content',
                                fontFamily: MONO,
                                fontSize: 13,
                                lineHeight: 1.6,
                            }}
                        >
                            <Box
                                component="pre"
                                aria-hidden="true"
                                sx={{
                                    m: 0,
                                    px: 1.5,
                                    py: 2,
                                    position: 'sticky',
                                    left: 0,
                                    textAlign: 'right',
                                    userSelect: 'none',
                                    color: 'rgba(255,255,255,0.35)',
                                    bgcolor: '#1e1f22',
                                    borderRight: '1px solid rgba(255,255,255,0.08)',
                                    font: 'inherit',
                                }}
                            >
                                {lineNumbers}
                            </Box>
                            <Box
                                component="pre"
                                ref={sourceRef}
                                sx={{ m: 0, p: 2, flex: 1, whiteSpace: 'pre', font: 'inherit' }}
                            >
                                {text}
                            </Box>
                        </Box>
                    </Box>

                    {showTop && (
                        <IconButton
                            aria-label="Back to top"
                            onClick={scrollToTop}
                            sx={{
                                position: 'absolute',
                                right: 24,
                                bottom: 16,
                                bgcolor: '#1976d2',
                                color: '#fff',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
                                '&:hover': { bgcolor: '#1565c0' },
                            }}
                        >
                            <MdArrowUpward size={ICON + 2} />
                        </IconButton>
                    )}
                </Box>
            </Box>

            {/* Status bar */}
            <Box
                sx={{
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 2,
                    px: 2,
                    py: 0.5,
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.65)',
                    bgcolor: 'rgba(15,15,15,0.95)',
                    borderTop: '1px solid rgba(255,255,255,0.12)',
                }}
            >
                <span>{stats.words.toLocaleString()} words</span>
                <span>{stats.chars.toLocaleString()} characters</span>
                <span>{stats.lines.toLocaleString()} lines</span>
                <span>{stats.minutes} min read</span>
                <span>{headings.length} headings</span>

                <Box sx={{ flex: 1 }} />

                {truncated && (
                    <Typography component="span" sx={{ fontSize: 12, color: '#ffb74d' }}>
                        Showing first {MAX_TEXT_BYTES / (1024 * 1024)} MB only. Download for the full file.
                    </Typography>
                )}

                <span>{Math.round(progress)}%</span>
            </Box>

            {/* Copy menu */}
            <Menu
                anchorEl={copyAnchor}
                open={Boolean(copyAnchor)}
                onClose={() => setCopyAnchor(null)}
                container={menuContainer}
            >
                {copyItems.map((item) => (
                    <MenuItem key={item.key} onClick={() => void handleCopy(item.key)}>
                        <ListItemIcon>{item.icon}</ListItemIcon>
                        <ListItemText>{item.label}</ListItemText>
                    </MenuItem>
                ))}
            </Menu>

            {/* Export menu */}
            <Menu
                anchorEl={exportAnchor}
                open={Boolean(exportAnchor)}
                onClose={() => setExportAnchor(null)}
                container={menuContainer}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                {exportItems.map((item) => (
                    <MenuItem key={item.key} onClick={() => handleExport(item.key)}>
                        <ListItemIcon>{item.icon}</ListItemIcon>
                        <ListItemText>{item.label}</ListItemText>
                    </MenuItem>
                ))}
                <Divider />
                <MenuItem onClick={handlePrint}>
                    <ListItemIcon>
                        <MdPictureAsPdf size={ICON + 2} />
                    </ListItemIcon>
                    <ListItemText secondary="Choose “Save as PDF” in the print dialog">PDF / Print</ListItemText>
                </MenuItem>
            </Menu>

            {/* Display settings */}
            <Popover
                open={Boolean(displayAnchor)}
                anchorEl={displayAnchor}
                onClose={() => setDisplayAnchor(null)}
                container={menuContainer}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Box sx={{ p: 2, width: 300, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box>
                        <Typography variant="caption" color="text.secondary">
                            Theme
                        </Typography>
                        <ToggleButtonGroup
                            fullWidth
                            size="small"
                            exclusive
                            value={prefs.paper}
                            onChange={(_event, value: Paper | null) => value && updatePrefs({ paper: value })}
                        >
                            <ToggleButton value="light">Light</ToggleButton>
                            <ToggleButton value="sepia">Sepia</ToggleButton>
                            <ToggleButton value="dark">Dark</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>

                    <Box>
                        <Typography variant="caption" color="text.secondary">
                            Page width
                        </Typography>
                        <ToggleButtonGroup
                            fullWidth
                            size="small"
                            exclusive
                            value={prefs.width}
                            onChange={(_event, value: PageWidth | null) => value && updatePrefs({ width: value })}
                        >
                            <ToggleButton value="narrow">Narrow</ToggleButton>
                            <ToggleButton value="normal">Normal</ToggleButton>
                            <ToggleButton value="wide">Wide</ToggleButton>
                            <ToggleButton value="full">Full</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>

                    <Box>
                        <Typography variant="caption" color="text.secondary">
                            Font
                        </Typography>
                        <ToggleButtonGroup
                            fullWidth
                            size="small"
                            exclusive
                            value={prefs.fontFamily}
                            onChange={(_event, value: FontFamily | null) =>
                                value && updatePrefs({ fontFamily: value })
                            }
                        >
                            <ToggleButton value="sans">Sans</ToggleButton>
                            <ToggleButton value="serif">Serif</ToggleButton>
                            <ToggleButton value="mono">Mono</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>

                    <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" color="text.secondary">
                                Text size · {prefs.fontSize}px
                            </Typography>
                            <Button
                                size="small"
                                sx={{ textTransform: 'none', minWidth: 0 }}
                                onClick={() => updatePrefs(DEFAULT_PREFS)}
                            >
                                Reset all
                            </Button>
                        </Box>
                        <Slider
                            size="small"
                            min={12}
                            max={22}
                            step={1}
                            value={prefs.fontSize}
                            onChange={(_event, value) => updatePrefs({ fontSize: value as number })}
                        />
                    </Box>
                </Box>
            </Popover>

            {/* Image lightbox */}
            <Dialog
                open={Boolean(lightbox)}
                onClose={() => setLightbox(null)}
                maxWidth={false}
                container={menuContainer}
                sx={{
                    '& .MuiDialog-paper': {
                        bgcolor: 'transparent',
                        boxShadow: 'none',
                        maxWidth: '95vw',
                        m: 1,
                    },
                }}
            >
                {lightbox && (
                    <Box
                        component="img"
                        src={lightbox.src}
                        alt={lightbox.alt}
                        onClick={() => setLightbox(null)}
                        sx={{
                            maxWidth: '95vw',
                            maxHeight: '90vh',
                            objectFit: 'contain',
                            cursor: 'zoom-out',
                            borderRadius: 1,
                            bgcolor: '#fff',
                        }}
                    />
                )}
            </Dialog>

            {/* Feedback */}
            <Snackbar
                open={Boolean(toast)}
                autoHideDuration={3000}
                onClose={() => setToast(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                {toast ? (
                    <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)}>
                        {toast.message}
                    </Alert>
                ) : undefined}
            </Snackbar>
        </Box>
    );
}