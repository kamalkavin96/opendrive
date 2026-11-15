import type { ComponentType } from 'react';
import type { FileResponse } from '../../api/types';

export interface PreviewProps {
  file: FileResponse;
  src: string;
}

export type PreviewCategory =
  | 'image'
  | 'video'
  | 'pdf'
  | 'audio'
  | 'text'
  | 'document'
  | 'spreadsheet'
  | 'unsupported';

export interface PreviewDefinition {
  category: PreviewCategory;
  extensions: string[];
  mimeTypes: string[];
  component: ComponentType<PreviewProps>;
}