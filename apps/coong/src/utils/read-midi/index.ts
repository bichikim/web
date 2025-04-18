import {Midi} from '@tonejs/midi'
import {ONE_MB, TEN} from '@winter-love/utils'

const DEFAULT_MAX_FILE_SIZE = TEN * ONE_MB

export const loadMidi = async (
  blob: File,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
): Promise<{midi: Midi; name: string} | undefined> => {
  try {
    if (blob.size > maxFileSize) {
      return undefined
    }

    const buffer = await blob.arrayBuffer()
    const midi = new Midi(buffer)

    return {
      midi,
      name: blob.name,
    }
  } catch {
    // ignore error
  }
}
