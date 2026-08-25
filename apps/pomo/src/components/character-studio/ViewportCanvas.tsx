import {clientOnly} from '@solidjs/start'

export const CharacterViewportCanvas = clientOnly(() => import('./Canvas'), {lazy: true})
