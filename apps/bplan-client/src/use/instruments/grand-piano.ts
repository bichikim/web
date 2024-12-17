import {Sampler} from 'tone'

export interface CreateGrandPianoOptions {
  onLoad?: () => void
}

export const createGrandPiano = (options: CreateGrandPianoOptions = {}) => {
  const piano = new Sampler({
    baseUrl: '/instruments/splendid-grand-piano/',
    onload: () => {
      options.onLoad?.()
    },
    urls: {
      'A#2': 'FF-A#2.ogg',
      'A#4': 'FF-A#4.ogg',
      A0: 'FF-A0.ogg',
      A1: 'FF-A1.ogg',
      A2: 'FF-A2.ogg',
      A3: 'FF-A3.ogg',
      A4: 'FF-A4.ogg',
      A5: 'FF-A5.ogg',
      'B-1': 'FF-B-1.ogg',
      B0: 'FF-B0.ogg',
      B1: 'FF-B1.ogg',
      B2: 'FF-B2.ogg',
      B3: 'FF-B3.ogg',
      B4: 'FF-B4.ogg',
      'C#1': 'FF-C#1.ogg',
      'C#5': 'FF-C#5.ogg',
      C2: 'FF-C2.ogg',
      C3: 'FF-C3.ogg',
      C4: 'FF-C4.ogg',
      'D#0': 'FF-D#0.ogg',
      D1: 'FF-D1.ogg',
      D2: 'FF-D2.ogg',
      D3: 'FF-D3.ogg',
      D4: 'FF-D4.ogg',
      D5: 'FF-D5.ogg',
      E1: 'FF-E1.ogg',
      E2: 'FF-E2.ogg',
      E3: 'FF-E3.ogg',
      E4: 'FF-E4.ogg',
      E5: 'FF-E5.ogg',
      F0: 'FF-F0.ogg',
      F1: 'FF-F1.ogg',
      F2: 'FF-F2.ogg',
      F3: 'FF-F3.ogg',
      F4: 'FF-F4.ogg',
      F5: 'FF-F5.ogg',
      'G#2': 'FF-G#2.ogg',
      'G#4': 'FF-G#4.ogg',
      G0: 'FF-G0.ogg',
      G1: 'FF-G1.ogg',
      G2: 'FF-G2.ogg',
      G3: 'FF-G3.ogg',
      G4: 'FF-G4.ogg',
      G5: 'FF-G5.ogg',
    },
  })
}
