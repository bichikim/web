import {z} from 'zod'
import {MAX_PHOTO_BYTES, MAX_VIDEO_BYTES} from '../background'
const HEX_RADIX = 16

const entrySchema = z.object({
  bytes: z.number().int().positive().max(MAX_VIDEO_BYTES),
  id: z.string().min(1),
  name: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/u),
  source: z.url().refine((value) => new URL(value).origin === 'https://storage.pomofi.io'),
})
export const backgroundSetSchema = z
  .object({
    id: z.string().min(1),
    items: z.array(entrySchema),
    kind: z.enum(['photo', 'video']),
    title: z.object({en: z.string(), ko: z.string()}),
  })
  .refine((set) => set.kind !== 'photo' || set.items.every((item) => item.bytes <= MAX_PHOTO_BYTES))
export type BackgroundSet = z.infer<typeof backgroundSetSchema>
const catalogSchema = z.object({sets: z.array(backgroundSetSchema), version: z.literal(1)})

/** Loads the public set catalog; invalid data and HTTP failures reject. */
export const loadBackgroundSets = async (signal: AbortSignal): Promise<BackgroundSet[]> => {
  const response = await fetch('/background-sets/index.json', {signal})
  if (!response.ok) {
    throw new Error('Unable to load background sets.')
  }
  return catalogSchema.parse(await response.json()).sets
}

/** Downloads and checks each catalog asset before returning files for local import. */
export const downloadBackgroundSet = async (
  set: BackgroundSet,
  signal: AbortSignal,
): Promise<File[]> => {
  const files: File[] = []
  for (const item of set.items) {
    // Bound network and decoded-blob memory while downloading a set.
    // eslint-disable-next-line no-await-in-loop
    const response = await fetch(item.source, {signal})
    if (!response.ok) {
      throw new Error('Unable to download a background set.')
    }
    // eslint-disable-next-line no-await-in-loop
    const bytes = await response.arrayBuffer()
    if (bytes.byteLength !== item.bytes) {
      throw new Error('Background set size does not match its catalog.')
    }
    // eslint-disable-next-line no-await-in-loop
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    const hash = Array.from(new Uint8Array(digest), (value) =>
      value.toString(HEX_RADIX).padStart(2, '0'),
    ).join('')
    if (hash !== item.sha256) {
      throw new Error('Background set checksum does not match its catalog.')
    }
    signal.throwIfAborted()
    files.push(
      new File([bytes], item.name, {
        type: set.kind === 'video' ? 'video/mp4' : (response.headers.get('content-type') ?? ''),
      }),
    )
  }
  return files
}
