import {fileFormat, type SyntaxLanguage} from './file-formats'

const syntaxEditability = {
  astro: true,
  css: true,
  html: true,
  ini: true,
  json: true,
  json5: true,
  jsonc: true,
  less: true,
  properties: true,
  python: true,
  ruby: true,
  rust: true,
  sass: true,
  scss: true,
  svelte: true,
  toml: true,
  vue: true,
  xml: true,
  yaml: true,
} satisfies Record<SyntaxLanguage, boolean>

/** Identifies source and text documents eligible for explicit saves. */
export const isEditableFile = (path: string): boolean => {
  const format = fileFormat(path)
  if (path === '' || format === undefined) {
    return false
  }
  switch (format.kind) {
    case 'code':
    case 'text':
    case 'markdown':
    case 'table':
      return true
    case 'syntax':
      return syntaxEditability[format.language]
    case 'image':
    case 'video':
    case 'audio':
    case 'pdf':
    case 'word':
    case 'spreadsheet':
      return false
    default: {
      const exhaustive: never = format
      return exhaustive
    }
  }
}
