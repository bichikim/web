import {expect, it, vi} from 'vitest'
import {getPlaybackSecret} from '../get-playback-secret'

it.each(['fixture', ' \tfixture\u00a0'])(
  'should return the trimmed configured value %j',
  (secret) => {
    expect(getPlaybackSecret({POMO_PLAYBACK_TOKEN_SECRET: secret})).toBe('fixture')
  },
)

it.each([undefined, '', ' \t\u00a0'])('should reject an unconfigured value %j', (secret) => {
  expect(() => getPlaybackSecret({POMO_PLAYBACK_TOKEN_SECRET: secret})).toThrowError(
    new TypeError('POMO_PLAYBACK_TOKEN_SECRET is not set'),
  )
})

it('should read the supplied configuration once', () => {
  const read = vi.fn(() => ' fixture ')
  const environment = {}
  Object.defineProperty(environment, 'POMO_PLAYBACK_TOKEN_SECRET', {get: read})

  expect(getPlaybackSecret(environment)).toBe('fixture')
  expect(read).toHaveBeenCalledOnce()
})

it('should preserve the native error for a non-string configured value', () => {
  const environment = {}
  Object.defineProperty(environment, 'POMO_PLAYBACK_TOKEN_SECRET', {value: 7})

  expect(() => getPlaybackSecret(environment)).toThrowError(
    'environment.POMO_PLAYBACK_TOKEN_SECRET?.trim is not a function',
  )
})

it('should propagate a configuration getter failure unchanged', () => {
  const failure = new Error('fixture getter failure')
  const environment = {}
  Object.defineProperty(environment, 'POMO_PLAYBACK_TOKEN_SECRET', {
    get: () => {
      throw failure
    },
  })

  let thrown: unknown
  try {
    getPlaybackSecret(environment)
  } catch (error) {
    thrown = error
  }
  expect(thrown).toBe(failure)
})
