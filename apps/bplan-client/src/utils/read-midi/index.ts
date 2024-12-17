import {Midi} from '@tonejs/midi'

export const loadMidi = async (blob: Blob): Promise<Midi> => {
  const buffer = await blob.arrayBuffer()
  return new Midi(buffer)
}
