import {
  MdAudiotrack,
  MdFolder,
  MdImage,
  MdInsertDriveFile,
  MdPictureAsPdf,
  MdVideocam,
} from 'react-icons/md';

interface Props {
  kind: 'folder' | 'file';
  contentType?: string | null;
  size?: number;
  color?: string;
}

export default function FileIcon({
  kind,
  contentType,
  size = 24,
  color,
}: Readonly<Props>) {

  // Folder icon uses its selected folder color.
  if (kind === 'folder') {
    return (
      <MdFolder
        size={size}
        color={color ?? '#F9A825'}
      />
    );
  }

  const type = contentType ?? '';

  if (type.startsWith('image/')) {
    return <MdImage size={size} color="#8250df" />;
  }

  if (type.startsWith('video/')) {
    return <MdVideocam size={size} color="#8250df" />;
  }

  if (type.startsWith('audio/')) {
    return <MdAudiotrack size={size} color="#bf3989" />;
  }

  if (type === 'application/pdf') {
    return <MdPictureAsPdf size={size} color="#d1242f" />;
  }

  return (
    <MdInsertDriveFile
      size={size}
      color="#6e7781"
    />
  );
}