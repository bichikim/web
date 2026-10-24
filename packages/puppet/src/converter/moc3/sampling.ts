/** Native MOC3 key lookup uses Float32 inputs and an absolute 0.001 parameter tolerance. */
export const MOC3_SAMPLING = {
  continuousPrecision: 'float32',
  discretePrecision: 'float32',
  keyTolerance: 0.001,
  keyToleranceUnit: 'parameter',
} as const
