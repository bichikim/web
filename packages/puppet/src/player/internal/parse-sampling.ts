import type {PuppetKeyformSampling, PuppetNumberPrecision} from '../document-sampling'
import {isFiniteNumber, isRecord} from './parse-primitives'

const MAX_KEY_TOLERANCE = 0.5

export const isOptionalPrecision = (value: unknown): value is PuppetNumberPrecision | undefined =>
  value === undefined || value === 'float32' || value === 'float64'

export const isOptionalSampling = (value: unknown): value is PuppetKeyformSampling | undefined =>
  value === undefined ||
  (isRecord(value) &&
    (value.keyToleranceUnit === undefined ||
      value.keyToleranceUnit === 'parameter' ||
      value.keyToleranceUnit === 'progress') &&
    isOptionalPrecision(value.continuousPrecision) &&
    isOptionalPrecision(value.discretePrecision) &&
    (value.keyTolerance === undefined ||
      (isFiniteNumber(value.keyTolerance) &&
        value.keyTolerance >= 0 &&
        value.keyTolerance < MAX_KEY_TOLERANCE)))
