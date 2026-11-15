import type { PreviewDefinition } from './previewTypes';

import ImagePreview from './renderers/ImagePreview';
import VideoPreview from './renderers/VideoPreview';
import PdfPreview from './renderers/PdfPreview';
import AudioPreview from './renderers/AudioPreview';
import UnsupportedPreview from './renderers/UnsupportedPreview';

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
      'mp4', 'webm', 'ogg', 'mov', 'mkv',
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
];

export const unsupportedPreview: PreviewDefinition = {
  category: 'unsupported',
  extensions: [],
  mimeTypes: [],
  component: UnsupportedPreview,
};