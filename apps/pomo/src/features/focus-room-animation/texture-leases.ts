import {Assets, type Texture} from 'pixi.js'

interface TextureEntry {
  consumers: number
  load: Promise<Texture>
  source: string
  status: 'failed' | 'loaded' | 'loading'
  unload: Promise<void> | null
}

export interface TextureLease {
  readonly release: () => void
  readonly source: string
  readonly texture: Texture
}

const entries = new Map<string, TextureEntry>()

const reportError = (error: unknown) => {
  globalThis.reportError(error)
}

const beginUnload = (entry: TextureEntry) => {
  if (entry.unload !== null || entry.status !== 'loaded' || entry.consumers !== 0) {
    return
  }

  entry.unload = Assets.unload(entry.source)
    .catch(reportError)
    .finally(() => {
      entries.delete(entry.source)
    })
}

const createEntry = (source: string): TextureEntry => {
  const entry: TextureEntry = {
    consumers: 0,
    load: Assets.load<Texture>(source),
    source,
    status: 'loading',
    unload: null,
  }
  entry.load = entry.load.then(
    (texture) => {
      entry.status = 'loaded'
      beginUnload(entry)
      return texture
    },
    (error: unknown) => {
      entry.status = 'failed'
      entries.delete(source)
      throw error
    },
  )
  entries.set(source, entry)
  return entry
}

const releaseEntry = (entry: TextureEntry) => {
  entry.consumers = Math.max(0, entry.consumers - 1)
  beginUnload(entry)
}

/** Acquires a reference-counted lease for a texture in Pixi's global asset cache. */
export async function acquireTexture(source: string): Promise<TextureLease> {
  const existingEntry = entries.get(source)

  if (existingEntry?.unload) {
    await existingEntry.unload
    return acquireTexture(source)
  }

  const entry = existingEntry ?? createEntry(source)
  entry.consumers += 1

  try {
    const texture = await entry.load
    let released = false

    return {
      release: () => {
        if (released) {
          return
        }

        released = true
        releaseEntry(entry)
      },
      source,
      texture,
    }
  } catch (error: unknown) {
    releaseEntry(entry)
    throw error
  }
}

/** Acquires an all-or-nothing group and releases successful partial loads on failure. */
export async function acquireTextureGroup(
  sources: readonly string[],
): Promise<readonly TextureLease[]> {
  const results = await Promise.allSettled(sources.map(async (source) => acquireTexture(source)))
  const failure = results.find((result) => result.status === 'rejected')
  const leases = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []))

  if (failure !== undefined) {
    releaseTextureGroup(leases)

    throw failure.reason
  }

  return leases
}

export function releaseTextureGroup(leases: readonly TextureLease[]) {
  for (const lease of leases) {
    lease.release()
  }
}
