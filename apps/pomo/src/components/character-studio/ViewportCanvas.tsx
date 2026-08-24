import {clientOnly} from '@solidjs/start'

export const CharacterViewportCanvas = clientOnly(() => import('../CharacterCanvas'), {lazy: true})
