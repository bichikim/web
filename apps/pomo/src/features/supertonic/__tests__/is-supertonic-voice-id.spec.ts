/** @vitest-environment node */
import {expect, it} from 'vitest'
import {isSupertonicVoiceId} from '../is-supertonic-voice-id'
import {SUPERTONIC_VOICES, type SupertonicVoiceId} from '@winter-love/supertonic/model'

it.each(SUPERTONIC_VOICES)('should accept the registered $id identifier', ({id}) => {
  const value: unknown = id
  expect(isSupertonicVoiceId(value)).toBe(true)
  if (isSupertonicVoiceId(value)) {
    const voiceId: SupertonicVoiceId = value
    expect(voiceId).toBe(id)
  }
})

it.each(['default', 'Sarah', 'yuna', ' Yuna ', '', null, undefined, 1, false, ['Yuna']])(
  'should reject an unregistered identifier %s',
  (value) => {
    expect(isSupertonicVoiceId(value)).toBe(false)
  },
)

it('should avoid inspecting or coercing object input', () => {
  const value = new Proxy(
    {},
    {
      get() {
        throw new Error('Input must not be inspected')
      },
    },
  )
  expect(isSupertonicVoiceId(value)).toBe(false)
})
