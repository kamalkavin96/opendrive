import type { PreviewDefinition } from './previewTypes';

import ImagePreview from './renderers/ImagePreview';
import VideoPreview from './renderers/VideoPreview';
import PdfPreview from './renderers/PdfPreview';
import AudioPreview from './renderers/AudioPreview';
import UnsupportedPreview from './renderers/UnsupportedPreview';
import ExcelPreview from './renderers/ExcelPreview';
import PptxPreview from './renderers/PptxPreview';
import DocxPreview from './renderers/DocxPreview';
import TextPreview from './renderers/TextPreview';
import MarkdownPreview from './renderers/MarkdownPreview';
import CsvPreview from './renderers/CsvPreview';

export const previewRegistry: PreviewDefinition[] = [
  {
    category: 'image',
    extensions: [
      'jpg', 'jpeg', 'png', 'gif', 'svg',
      'webp', 'bmp', 'avif', 'tiff', 'ico',
    ],
    mimeTypes: ['image/'],
    component: ImagePreview,
  },
  {
    category: 'video',
    extensions: [
      'mp4', 'webm', 'mov', 'mkv',
      'avi', 'm4v', 'mpeg', 'mpg', '3gp',
    ],
    mimeTypes: ['video/'],
    component: VideoPreview,
  },
  {
    category: 'pdf',
    extensions: ['pdf'],
    mimeTypes: ['application/pdf'],
    component: PdfPreview,
  },
  {
    category: 'audio',
    extensions: [
      'mp3', 'wav', 'ogg', 'aac',
      'flac', 'm4a', 'opus', 'aiff',
    ],
    mimeTypes: ['audio/'],
    component: AudioPreview,
  },
  {
    category: 'spreadsheet',
    extensions: ['xlsx', 'xlsm', 'xls'],
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel.sheet.macroenabled.12',
      'application/vnd.ms-excel',
    ],
    component: ExcelPreview,
  },
  {
    category: 'csv',
    extensions: ['csv', 'tsv'],
    mimeTypes: ['text/csv', 'text/tab-separated-values'],
    component: CsvPreview,
  },
  {
    category: 'presentation',
    extensions: ['pptx'],
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
    component: PptxPreview,
  },
  {
    category: 'document',
    extensions: ['docx'],
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    component: DocxPreview,
  },
  {
    category: 'markdown',
    extensions: ['md', 'markdown'],
    mimeTypes: ['text/markdown'],
    component: MarkdownPreview,
  },
  {
    // Keep this LAST: 'text/' is a catch-all prefix
    category: 'text',
    extensions: [
      'txt', 'log', 'json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'conf',
      'properties', 'env', 'gitignore', 'sql', 'sh', 'bat', 'ps1',
      'js', 'jsx', 'mjs', 'ts', 'tsx', 'css', 'scss', 'less',
      'html', 'htm', 'java', 'kt', 'py', 'go', 'rs', 'c', 'cpp', 'h',
      'cs', 'php', 'rb', 'swift', 'dart', 'gradle',
    ],
    mimeTypes: [
      'text/',
      'application/json',
      'application/xml',
      'application/x-yaml',
      'application/javascript',
    ],
    component: TextPreview,
  },
];

export const unsupportedPreview: PreviewDefinition = {
  category: 'unsupported',
  extensions: [],
  mimeTypes: [],
  component: UnsupportedPreview,
};