import type {PuppetDocument} from '@winter-love/puppet/player'
import type {CharacterAction} from './types'

export const modelActions = (document: PuppetDocument): readonly CharacterAction[] => [
  ...(document.expressions ?? []).map((expression) => ({
    action: {id: expression.id, kind: 'expression' as const},
    label: expression.id,
  })),
  ...document.motions.map((motion) => ({
    action: {id: motion.id, kind: 'motion' as const},
    label: motion.name ?? motion.id,
    parameterIds: [
      ...new Set(
        motion.tracks.flatMap((track) => (track.kind === 'parameter' ? [track.parameterId] : [])),
      ),
    ],
  })),
]
