import {replaceObjectUrl} from './replace-object-url'
export * from './replace-object-url'

/** Revokes the previous URL before obtaining the next Blob; null clears without creating a URL. */
export const replaceBlobObjectUrl = (
  previous: string | null,
  getNext: () => Blob | null,
): string | null =>
  replaceObjectUrl(previous, getNext, {
    create: (blob) => URL.createObjectURL(blob),
    revoke: (url) => URL.revokeObjectURL(url),
  })
