import type { FileResponse } from '../../api/types';
import { getPreviewDefinition } from '../../utils/filePreviewUtils';

interface Props {
  file: FileResponse;
  src: string;
}

export default function FilePreviewContent({ file, src }: Readonly<Props>) {
  const definition = getPreviewDefinition(file);
  const PreviewComponent = definition.component;

  return (
    <PreviewComponent
      file={file}
      src={src}
    />
  );
}