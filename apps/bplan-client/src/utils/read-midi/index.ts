import {Midi} from '@tonejs/midi/src/Midi'

export const loadMidi = async (blob: File): Promise<{midi: Midi; name: string}> => {
  const buffer = await blob.arrayBuffer()
  const midi = new Midi(buffer)
  return {
    midi,
    name: blob.name,
  }
}
