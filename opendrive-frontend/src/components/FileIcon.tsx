import {
  MdAudiotrack,
  MdFolder,
  MdImage,
  MdInsertDriveFile,
  MdPictureAsPdf,
  MdVideocam,
  MdDescription,
  MdTableChart,
  MdSlideshow,
  MdArchive,
  MdCode,
  MdTextSnippet,
  MdTerminal,
  MdSettings,
  MdStorage,
  MdSecurity,
  MdFontDownload,
  MdApps,
} from 'react-icons/md';

interface Props {
  kind: 'folder' | 'file';
  contentType?: string | null;
  fileName?: string;
  size?: number;
  color?: string;
}

const FILE_COLORS = {
  word: '#185ABD',
  excel: '#217346',
  powerpoint: '#D24726',
  pdf: '#E53935',
  image: '#8E44AD',
  video: '#8250df',
  audio: '#bf3989',
  archive: '#D97706',
  code: '#64748B',
  text: '#6B7280',
  config: '#0891B2',
  database: '#2563EB',
  security: '#DC2626',
  font: '#9333EA',
  executable: '#475569',
  temporary: '#9CA3AF',
  default: '#6e7781',
};

const EXTENSIONS = {
  word: [
    'doc', 'docx', 'docm', 'dot', 'dotx', 'odt', 'rtf',
  ],

  excel: [
    'xls', 'xlsx', 'xlsm', 'xlsb', 'xlt', 'xltx',
    'ods', 'csv', 'tsv',
  ],

  powerpoint: [
    'ppt', 'pptx', 'pptm', 'pps', 'ppsx', 'potx', 'odp',
  ],

  image: [
    'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp',
    'bmp', 'ico', 'avif', 'tiff', 'tif', 'heic',
    'heif', 'raw', 'psd', 'ai', 'eps',
  ],

  video: [
    'mp4', 'mkv', 'avi', 'mov', 'webm', 'flv',
    'wmv', 'm4v', 'mpeg', 'mpg', '3gp', 'ts',
  ],

  audio: [
    'mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a',
    'wma', 'opus', 'aiff', 'mid', 'midi',
  ],

  archive: [
    'zip', 'rar', '7z', 'tar', 'gz', 'bz2',
    'xz', 'zst', 'tgz', 'iso', 'cab', 'ar',
  ],

  programming: [
    // Java and JVM
    'java', 'class', 'jar', 'war', 'ear', 'kt',
    'kts', 'scala', 'groovy',

    // JavaScript / TypeScript
    'js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx',

    // Python
    'py', 'pyw', 'pyc', 'pyo', 'pyx', 'ipynb',

    // Web
    'html', 'htm', 'css', 'scss', 'sass', 'less',

    // C / C++
    'c', 'h', 'cpp', 'hpp', 'cc', 'hh', 'cxx', 'hxx',

    // .NET
    'cs', 'csx', 'vb', 'fs', 'fsx',

    // Other languages
    'go', 'rs', 'php', 'rb', 'r', 'swift', 'm',
    'mm', 'dart', 'lua', 'pl', 'pm', 'ex', 'exs',
    'erl', 'hrl', 'hs', 'lhs', 'clj', 'cljs',
    'cljc', 'edn', 'elm', 'vue', 'svelte',
    'sol', 'cob', 'cbl', 'f', 'f90', 'for',
    'pas', 'pp', 'asm', 's', 'zig', 'nim',
    'v', 'sv', 'vhd', 'vhdl',
  ],

  config: [
    'json', 'jsonc', 'json5', 'xml', 'yaml', 'yml',
    'toml', 'ini', 'cfg', 'conf', 'properties',
    'env', 'editorconfig', 'gitignore', 'gitattributes',
    'dockerignore', 'npmrc', 'nvmrc', 'babelrc',
    'eslintrc', 'prettierrc', 'lock',
    'gradle', 'pom', 'tf', 'tfvars', 'hcl',
  ],

  database: [
    'sql', 'db', 'sqlite', 'sqlite3', 'mdb',
    'accdb', 'dump', 'ibd', 'frm', 'myd',
    'myi', 'parquet', 'avro',
  ],

  text: [
    'txt', 'md', 'markdown', 'rst', 'tex', 'adoc',
    'nfo', 'rtf',
  ],

  logs: [
    'log', 'out', 'err', 'trace', 'stacktrace',
  ],

  terminal: [
    'sh', 'bash', 'zsh', 'fish', 'ps1',
    'psm1', 'psd1', 'bat', 'cmd',
  ],

  security: [
    'pem', 'crt', 'cer', 'der', 'p12',
    'pfx', 'p7b', 'p7c', 'p7s', 'key',
    'pub', 'csr', 'jks', 'keystore', 'truststore',
    'asc', 'gpg', 'pgp', 'p8', 'p10',
  ],

  fonts: [
    'ttf', 'otf', 'woff', 'woff2', 'eot',
  ],

  executable: [
    'exe', 'msi', 'app', 'apk', 'aab',
    'dmg', 'pkg', 'bin', 'elf', 'so',
    'dylib', 'sys', 'com', 'dll',
  ],

  temporary: [
    'tmp', 'temp', 'swp', 'swo', 'bak',
    'old', 'orig', 'cache', 'part', 'crdownload',
    'download', 'partial',
  ],
};

const SPECIAL_FILES: Record<string, keyof typeof EXTENSIONS> = {
  // Security and certificates
  'id_rsa': 'security',
  'id_dsa': 'security',
  'id_ecdsa': 'security',
  'id_ed25519': 'security',
  'known_hosts': 'security',
  'authorized_keys': 'security',
  'authorized_keys2': 'security',
  'known_hosts.old': 'security',

  // Configuration files
  '.env': 'config',
  '.env.local': 'config',
  '.env.development': 'config',
  '.env.production': 'config',
  '.env.test': 'config',
  '.env.example': 'config',
  '.gitignore': 'config',
  '.gitattributes': 'config',
  '.gitmodules': 'config',
  '.dockerignore': 'config',
  '.editorconfig': 'config',
  '.npmrc': 'config',
  '.nvmrc': 'config',
  '.babelrc': 'config',
  '.prettierrc': 'config',
  '.eslintrc': 'config',
  'dockerfile': 'config',
  'docker-compose.yml': 'config',
  'docker-compose.yaml': 'config',
  'vagrantfile': 'config',
  'gemfile': 'config',
  'procfile': 'config',
  'terraform.tf': 'config',

  // Programming
  'makefile': 'programming',
  'gnumakefile': 'programming',
  'jenkinsfile': 'programming',
  'gradlew': 'terminal',
  'gradlew.bat': 'terminal',

  // Documentation
  'license': 'text',
  'readme': 'text',
  'changelog': 'text',
  'contributing': 'text',
  'authors': 'text',
  'copying': 'text',

  // Logs
  'npm-debug.log': 'logs',
  'yarn-error.log': 'logs',
  'pnpm-debug.log': 'logs',
};

function hasExtension(extension: string, extensions: string[]): boolean {
  return extensions.includes(extension);
}

function getExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');

  // Avoid treating hidden filenames like .env as extensions.
  if (lastDot <= 0 || lastDot === fileName.length - 1) {
    return '';
  }

  return fileName.substring(lastDot + 1);
}

export default function FileIcon({
  kind,
  contentType,
  fileName,
  size = 24,
  color,
}: Readonly<Props>) {

  // Folder
  if (kind === 'folder') {
    return (
      <MdFolder
        size={size}
        color={color ?? '#F9A825'}
      />
    );
  }

  const name = (fileName ?? '').toLowerCase().trim();
  const type = (contentType ?? '').toLowerCase();

  // Extract filename without any directory path.
  const fileNameOnly = name.split(/[\\/]/).pop() ?? name;

  const extension = getExtension(fileNameOnly);

  // Special filenames
  const specialType = SPECIAL_FILES[fileNameOnly];

  if (specialType) {
    switch (specialType) {
      case 'security':
        return <MdSecurity size={size} color={FILE_COLORS.security} />;

      case 'config':
        return <MdSettings size={size} color={FILE_COLORS.config} />;

      case 'programming':
        return <MdCode size={size} color={FILE_COLORS.code} />;

      case 'terminal':
        return <MdTerminal size={size} color={FILE_COLORS.code} />;

      case 'text':
        return <MdTextSnippet size={size} color={FILE_COLORS.text} />;

      case 'logs':
        return <MdTextSnippet size={size} color={FILE_COLORS.text} />;

      default:
        break;
    }
  }

  // Security files - check before generic file types.
  if (
    hasExtension(extension, EXTENSIONS.security) ||
    type.includes('x-pem-file') ||
    type.includes('pkix-cert') ||
    type.includes('pkcs12') ||
    type.includes('x-x509-ca-cert')
  ) {
    return <MdSecurity size={size} color={FILE_COLORS.security} />;
  }

  // Microsoft Word
  if (
    hasExtension(extension, EXTENSIONS.word) ||
    type.includes('wordprocessingml') ||
    type === 'application/msword'
  ) {
    return <MdDescription size={size} color={FILE_COLORS.word} />;
  }

  // Microsoft Excel
  if (
    hasExtension(extension, EXTENSIONS.excel) ||
    type.includes('spreadsheetml') ||
    type === 'application/vnd.ms-excel'
  ) {
    return <MdTableChart size={size} color={FILE_COLORS.excel} />;
  }

  // Microsoft PowerPoint
  if (
    hasExtension(extension, EXTENSIONS.powerpoint) ||
    type.includes('presentationml') ||
    type === 'application/vnd.ms-powerpoint'
  ) {
    return <MdSlideshow size={size} color={FILE_COLORS.powerpoint} />;
  }

  // PDF
  if (
    extension === 'pdf' ||
    type === 'application/pdf'
  ) {
    return <MdPictureAsPdf size={size} color={FILE_COLORS.pdf} />;
  }

  // Images
  if (
    hasExtension(extension, EXTENSIONS.image) ||
    type.startsWith('image/')
  ) {
    return <MdImage size={size} color={FILE_COLORS.image} />;
  }

  // Video
  if (
    hasExtension(extension, EXTENSIONS.video) ||
    type.startsWith('video/')
  ) {
    return <MdVideocam size={size} color={FILE_COLORS.video} />;
  }

  // Audio
  if (
    hasExtension(extension, EXTENSIONS.audio) ||
    type.startsWith('audio/')
  ) {
    return <MdAudiotrack size={size} color={FILE_COLORS.audio} />;
  }

  // Archives
  if (
    hasExtension(extension, EXTENSIONS.archive) ||
    type.includes('zip') ||
    type.includes('compressed') ||
    type.includes('x-tar') ||
    type.includes('gzip')
  ) {
    return <MdArchive size={size} color={FILE_COLORS.archive} />;
  }

  // Database files
  if (hasExtension(extension, EXTENSIONS.database)) {
    return <MdStorage size={size} color={FILE_COLORS.database} />;
  }

  // Terminal scripts
  if (hasExtension(extension, EXTENSIONS.terminal)) {
    return <MdTerminal size={size} color={FILE_COLORS.code} />;
  }

  // Configuration files
  if (hasExtension(extension, EXTENSIONS.config)) {
    return <MdSettings size={size} color={FILE_COLORS.config} />;
  }

  // Programming languages
  if (hasExtension(extension, EXTENSIONS.programming)) {
    return <MdCode size={size} color={FILE_COLORS.code} />;
  }

  // Fonts
  if (hasExtension(extension, EXTENSIONS.fonts)) {
    return <MdFontDownload size={size} color={FILE_COLORS.font} />;
  }

  // Executables
  if (hasExtension(extension, EXTENSIONS.executable)) {
    return <MdApps size={size} color={FILE_COLORS.executable} />;
  }

  // Log files
  if (
    hasExtension(extension, EXTENSIONS.logs) ||
    type.includes('log')
  ) {
    return <MdTextSnippet size={size} color={FILE_COLORS.text} />;
  }

  // Temporary and backup files
  if (
    hasExtension(extension, EXTENSIONS.temporary) ||
    fileNameOnly.endsWith('~')
  ) {
    return <MdTextSnippet size={size} color={FILE_COLORS.temporary} />;
  }

  // Generic text files
  if (
    type.startsWith('text/') ||
    extension === 'txt' ||
    extension === 'md'
  ) {
    return <MdTextSnippet size={size} color={FILE_COLORS.text} />;
  }

  // Unknown file
  return (
    <MdInsertDriveFile
      size={size}
      color={FILE_COLORS.default}
    />
  );
}