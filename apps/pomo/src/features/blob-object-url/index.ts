import {replaceObjectUrl} from './replace-object-url'
export * from './replace-object-url'

export interface BlobObjectUrlOptions {
  readonly order?: 'create-first' | 'revoke-first'
}

/** Replaces an owned Blob URL in the requested order; null clears without creating a URL. */
export function replaceBlobObjectUrl(
  previous: string | null,
  getNext: () => Blob,
  options?: BlobObjectUrlOptions,
): string
export function replaceBlobObjectUrl(
  previous: string | null,
  getNext: () => Blob | null,
  options?: BlobObjectUrlOptions,
): string | null
export function replaceBlobObjectUrl(
  previous: string | null,
  getNext: () => Blob | null,
  options?: BlobObjectUrlOptions,
): string | null {
  return replaceObjectUrl(previous, getNext, {
    create: (blob) => URL.createObjectURL(blob),
    order: options?.order,
    revoke: (url) => URL.revokeObjectURL(url),
  })
}
