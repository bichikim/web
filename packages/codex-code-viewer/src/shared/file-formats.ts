const code = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs']
export type SyntaxLanguage = 'rust' | 'yaml' | 'toml' | 'json' | 'jsonc' | 'json5' | 'html'
const syntax = new Map<string, SyntaxLanguage>([
  ['.rs', 'rust'],
  ['.yaml', 'yaml'],
  ['.yml', 'yaml'],
  ['.toml', 'toml'],
  ['.json', 'json'],
  ['.jsonc', 'jsonc'],
  ['.json5', 'json5'],
  ['.html', 'html'],
  ['.htm', 'html'],
])
const markdown = ['.md', '.markdown', '.mdx']
const table = ['.csv', '.tsv']
export const TEXT_FILE_NAMES = [
  'Dockerfile',
  'Containerfile',
  'Makefile',
  'Justfile',
  'LICENSE',
  'NOTICE',
  'README',
]
export const HIDDEN_TEXT_FILES = [
  '.dockerignore',
  '.gitignore',
  '.gitattributes',
  '.gitmodules',
  '.editorconfig',
  '.prettierignore',
  '.eslintignore',
  '.npmignore',
  '.browserslistrc',
]
const text = [
  '.txt',
  '.text',
  '.lock',
  '.css',
  '.scss',
  '.sass',
  '.less',
  '.xml',
  '.ini',
  '.conf',
  '.cfg',
  '.properties',
  '.log',
  '.sh',
  '.bash',
  '.zsh',
  '.fish',
  '.sql',
  '.py',
  '.rb',
  '.go',
  '.java',
  '.kt',
  '.c',
  '.h',
  '.cpp',
  '.hpp',
  '.cs',
  '.swift',
  '.vue',
  '.svelte',
  '.astro',
  '.graphql',
  '.gql',
  '.proto',
]
const image = new Map([
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.webp', 'image/webp'],
  ['.svg', 'image/svg+xml'],
  ['.avif', 'image/avif'],
  ['.bmp', 'image/bmp'],
  ['.ico', 'image/x-icon'],
])
const video = new Map([
  ['.mp4', 'video/mp4'],
  ['.m4v', 'video/mp4'],
  ['.webm', 'video/webm'],
  ['.mov', 'video/quicktime'],
  ['.ogv', 'video/ogg'],
])
const audio = new Map([
  ['.mp3', 'audio/mpeg'],
  ['.wav', 'audio/wav'],
  ['.m4a', 'audio/mp4'],
  ['.aac', 'audio/aac'],
  ['.ogg', 'audio/ogg'],
  ['.oga', 'audio/ogg'],
  ['.opus', 'audio/ogg'],
  ['.flac', 'audio/flac'],
  ['.weba', 'audio/webm'],
])
export const FILE_EXTENSIONS = [
  ...code,
  ...syntax.keys(),
  ...markdown,
  ...table,
  ...text,
  ...HIDDEN_TEXT_FILES,
  ...image.keys(),
  ...video.keys(),
  ...audio.keys(),
  '.pdf',
]

interface TextFormat {
  readonly kind: 'code' | 'markdown' | 'table' | 'text'
}
interface SyntaxFormat {
  readonly kind: 'syntax'
  readonly language: SyntaxLanguage
}
interface MediaFormat {
  readonly kind: 'image' | 'video' | 'audio' | 'pdf'
  readonly mimeType: string
}
export type FileFormat = TextFormat | SyntaxFormat | MediaFormat

export const fileFormat = (path: string): FileFormat | undefined => {
  const basename = path.split(/[/\\]/u).at(-1) ?? ''
  if (basename.startsWith('.') && !HIDDEN_TEXT_FILES.includes(basename)) {
    return undefined
  }
  const extension = basename.slice(basename.lastIndexOf('.')).toLowerCase()
  const language = basename === 'Cargo.lock' ? 'toml' : syntax.get(extension)
  if (language !== undefined) {
    return {kind: 'syntax', language}
  }
  if (code.includes(extension)) {
    return {kind: 'code'}
  }
  if (markdown.includes(extension)) {
    return {kind: 'markdown'}
  }
  if (table.includes(extension)) {
    return {kind: 'table'}
  }
  if (text.includes(extension)) {
    return {kind: 'text'}
  }
  const imageType = image.get(extension)
  if (extension === '.pdf') {
    return {kind: 'pdf', mimeType: 'application/pdf'}
  }
  if (imageType !== undefined) {
    return {kind: 'image', mimeType: imageType}
  }
  const audioType = audio.get(extension)
  if (audioType !== undefined) {
    return {kind: 'audio', mimeType: audioType}
  }
  const videoType = video.get(extension)
  return videoType === undefined ? {kind: 'text'} : {kind: 'video', mimeType: videoType}
}
