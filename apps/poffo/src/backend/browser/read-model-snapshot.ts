import {modelEventSchema} from '../protocol'

interface ReadModelSnapshotOptions {
  readonly url: string
  readonly headers: Readonly<Record<string, string>>
  readonly signal: AbortSignal
}

/** A finite response lets WebKit finish large initial documents independently of the live stream. */
export const readModelSnapshot = async ({url, headers, signal}: ReadModelSnapshotOptions) => {
  const response = await fetch(`${url}/api/snapshot`, {headers, signal})
  if (!response.ok) {
    throw new Error(`Backend snapshot failed: ${response.status}`)
  }
  return modelEventSchema.parse(await response.json())
}
