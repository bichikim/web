export const MAX_ATTACHMENT_NAME_BYTES = 255

/** Names a selected-code or draft-patch snapshot within the filesystem UTF-8 filename limit. */
export const contextAttachmentFilename = (path: string, kind: 'selection' | 'changes'): string => {
  const suffix = kind === 'selection' ? '.selection.txt' : '.changes.patch'
  const characters = Array.from(path.split(/[\\/]/u).at(-1) ?? '')
  const encoder = new TextEncoder()
  while (encoder.encode(characters.join('') + suffix).length > MAX_ATTACHMENT_NAME_BYTES) {
    characters.pop()
  }
  return characters.join('') + suffix
}
