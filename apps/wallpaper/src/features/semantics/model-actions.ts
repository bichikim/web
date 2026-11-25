import type {PuppetDocument} from '@winter-love/puppet/player'
import type {CharacterAction} from './types'
import {actionName} from './action-name'

export const modelActions = (document: PuppetDocument): readonly CharacterAction[] => [
  ...(document.expressions ?? []).map((expression) => ({
    action: {id: expression.id, kind: 'expression' as const},
    label: actionName({id: expression.id, kind: 'expression'}, expression.name),
    parameterIds: expression.parameters.map((parameter) => parameter.parameterId),
  })),
  ...document.motions.map((motion) => ({
    action: {id: motion.id, kind: 'motion' as const},
    label: actionName({id: motion.id, kind: 'motion'}, motion.name),
    parameterIds: [
      ...new Set(
        motion.tracks.flatMap((track) => (track.kind === 'parameter' ? [track.parameterId] : [])),
      ),
    ],
  })),
]
