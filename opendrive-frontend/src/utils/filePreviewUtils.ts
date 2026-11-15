import type { FileResponse } from '../api/types';
import { previewRegistry, unsupportedPreview } from '../components/filepreview/previewRegistry';


export function getPreviewDefinition(file: FileResponse) {
  const extension = file.fileName
    .split('.')
    .pop()
    ?.toLowerCase() ?? '';

  const contentType = file.contentType
    ?.split(';')[0]
    .trim()
    .toLowerCase() ?? '';

  return (
    previewRegistry.find((definition) =>
      definition.extensions.includes(extension) ||
      definition.mimeTypes.some((mime) =>
        mime.endsWith('/')
          ? contentType.startsWith(mime)
          : contentType === mime
      )
    ) ?? unsupportedPreview
  );
}