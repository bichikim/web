const BANDWIDTH = 80
const DEFAULT_PITCH = 120
const DEFAULT_RMS = 0.1
const THIRD_FORMANT = 2700
const FOURTH_FORMANT = 3400

/** F3 and F4, which every vowel has and which keep linear prediction's spare poles busy. */
const HIGHER_FORMANTS = [THIRD_FORMANT, FOURTH_FORMANT]

export interface SynthesizeVowelOptions {
  readonly length: number
  readonly pitch?: number
  readonly rate: number
  readonly rms?: number
}

/**
 * A voiced vowel by the source–filter model: a pulse train at `pitch` Hz through resonators at
 * `formants` and the higher formants, scaled to `rms`.
 */
export const synthesizeVowel = (
  formants: readonly number[],
  {length, pitch = DEFAULT_PITCH, rate, rms = DEFAULT_RMS}: SynthesizeVowelOptions,
) => {
  const samples = Float64Array.from({length}, (_, index) =>
    index % Math.round(rate / pitch) === 0 ? 1 : 0,
  )
  for (const frequency of [...formants, ...HIGHER_FORMANTS]) {
    const radius = Math.exp((-Math.PI * BANDWIDTH) / rate)
    const feedback = 2 * radius * Math.cos((2 * Math.PI * frequency) / rate)
    let [previous, earlier] = [0, 0]
    for (let index = 0; index < length; index += 1) {
      const value = samples[index]! + feedback * previous - radius * radius * earlier
      ;[earlier, previous] = [previous, value]
      samples[index] = value
    }
  }
  const power = Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / length)
  return samples.map((value) => (value / power) * rms)
}
