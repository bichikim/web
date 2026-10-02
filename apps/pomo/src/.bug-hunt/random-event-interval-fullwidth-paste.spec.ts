import {expect, it} from 'vitest'

import {normalizePasteNumericInput} from 'src/utils/normalize-paste-numeric-input'

const MAXIMUM_INTERVAL_MINUTES = 120
const MINIMUM_INTERVAL_MINUTES = 1

/** Mirrors RandomEventSettings.parseInterval (not exported from the module). */
const parseRandomEventIntervalDraft = (draft: {readonly maximum: string; readonly minimum: string}) => {
  const maximumMinutes = Number(draft.maximum)
  const minimumMinutes = Number(draft.minimum)

  if (
    !Number.isInteger(maximumMinutes) ||
    !Number.isInteger(minimumMinutes) ||
    minimumMinutes < MINIMUM_INTERVAL_MINUTES ||
    maximumMinutes > MAXIMUM_INTERVAL_MINUTES ||
    minimumMinutes > maximumMinutes
  ) {
    return null
  }

  return {maximumMinutes, minimumMinutes}
}

it('should accept fullwidth random event interval values pasted into the fields', () => {
  const minimum = '１２'
  const maximum = '２４'

  expect(parseRandomEventIntervalDraft({maximum, minimum})).toEqual({
    maximumMinutes: 24,
    minimumMinutes: 12,
  })
  expect(Number(normalizePasteNumericInput(minimum))).toBe(12)
  expect(Number(normalizePasteNumericInput(maximum))).toBe(24)
})
