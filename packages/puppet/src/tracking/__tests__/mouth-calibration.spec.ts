import {expect, test} from 'vitest'
import {
  calibrateMouthValues,
  DEFAULT_MOUTH_SETTINGS,
  isMouthTrackingSettings,
} from '../mouth-calibration'

test('should remove the resting pose and normalize remaining mouth movement', () => {
  const settings = {
    ...DEFAULT_MOUTH_SETTINGS,
    neutral: {mouthOpen: 0.2, mouthRound: 0.3, mouthSpread: 0.1},
  }
  expect(calibrateMouthValues({...settings.neutral, faceYaw: 12}, settings)).toEqual({
    faceYaw: 12,
    mouthOpen: 0,
    mouthRound: 0,
    mouthSpread: 0,
  })
  expect(
    calibrateMouthValues({mouthOpen: 0.6, mouthRound: 0.65, mouthSpread: 0.55}, settings),
  ).toEqual({
    mouthOpen: expect.closeTo(0.5),
    mouthRound: expect.closeTo(0.5),
    mouthSpread: expect.closeTo(0.5),
  })
})
test('should apply independent sensitivities, clamp inputs, and preserve missing channels', () => {
  const settings = {...DEFAULT_MOUTH_SETTINGS, roundSensitivity: 2, spreadSensitivity: 0.5}
  expect(
    calibrateMouthValues({mouthOpen: 0.5, mouthRound: 0.4, mouthSpread: 0.4}, settings),
  ).toEqual({mouthOpen: 0.5, mouthRound: 0.8, mouthSpread: 0.2})
  expect(calibrateMouthValues({mouthRound: 2, mouthSpread: -1}, settings)).toEqual({
    mouthRound: 1,
    mouthSpread: 0,
  })
  expect(calibrateMouthValues({faceYaw: 10}, settings)).toEqual({faceYaw: 10})
  expect(
    calibrateMouthValues(
      {mouthRound: 1},
      {...settings, neutral: {...settings.neutral, mouthRound: 1}},
    ),
  ).toEqual({mouthRound: 0})
})
test('should reject malformed baselines and nonfinite or out-of-range sensitivities', () => {
  expect(isMouthTrackingSettings(DEFAULT_MOUTH_SETTINGS)).toBe(true)
  expect(isMouthTrackingSettings({...DEFAULT_MOUTH_SETTINGS, roundSensitivity: Number.NaN})).toBe(
    false,
  )
  expect(isMouthTrackingSettings({...DEFAULT_MOUTH_SETTINGS, spreadSensitivity: 0})).toBe(false)
  expect(isMouthTrackingSettings({...DEFAULT_MOUTH_SETTINGS, neutral: {mouthOpen: 0}})).toBe(false)
})

test('should scale calibrated opening independently and retain legacy sensitivity defaults', () => {
  const legacy = {
    neutral: {mouthOpen: 0.2, mouthRound: 0, mouthSpread: 0},
    roundSensitivity: 1,
    spreadSensitivity: 1,
  }
  expect(isMouthTrackingSettings(legacy)).toBe(true)
  const values = {mouthOpen: 0.4, mouthRound: 0.3, mouthSpread: 0.6}
  expect(calibrateMouthValues(values, legacy).mouthOpen).toBeCloseTo(0.25)
  expect(calibrateMouthValues(values, {...legacy, openSensitivity: 2})).toEqual({
    mouthOpen: 0.5,
    mouthRound: 0.3,
    mouthSpread: 0.6,
  })
  expect(isMouthTrackingSettings({...legacy, openSensitivity: 0})).toBe(false)
})
