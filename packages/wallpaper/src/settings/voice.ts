import {z} from 'zod'
import {SUPERTONIC_LANGUAGES} from '@winter-love/supertonic/language'
import {SUPERTONIC_VOICES} from '@winter-love/supertonic/model'

const MINIMUM_SPEED = 0.5
const PERCENT = 100

export const poffoVoiceSchema = z.object({
  enabled: z.boolean(),
  gpu: z.boolean().default(true),
  language: z.enum(SUPERTONIC_LANGUAGES),
  model: z.enum(['int8', 'full']),
  provider: z.preprocess(
    (provider) => (provider === 'haetsal' || provider === 'codex' ? 'chatgpt' : provider),
    z.enum(['local', 'chatgpt']).default('local'),
  ),
  speed: z.number().finite().min(MINIMUM_SPEED).max(2),
  voice: z.enum(SUPERTONIC_VOICES.map((voice) => voice.id)),
  volume: z.number().finite().min(0).max(PERCENT),
})
export type PoffoVoice = z.infer<typeof poffoVoiceSchema>
export const DEFAULT_POFFO_VOICE: PoffoVoice = {
  enabled: false,
  gpu: true,
  language: 'ko',
  model: 'int8',
  provider: 'local',
  speed: 1,
  voice: 'Yuna',
  volume: 80,
}
