import {replaceObjectUrl} from './replace-object-url'
export * from './replace-object-url'

/** Revokes the previous URL before obtaining the next Blob; null clears without creating a URL. */
export function replaceBlobObjectUrl(previous: string | null, getNext: () => Blob): string
export function replaceBlobObjectUrl(
  previous: string | null,
  getNext: () => Blob | null,
): string | null
export function replaceBlobObjectUrl(
  previous: string | null,
  getNext: () => Blob | null,
): string | null {
  return replaceObjectUrl(previous, getNext, {
    create: (blob) => URL.createObjectURL(blob),
    revoke: (url) => URL.revokeObjectURL(url),
  })
}
