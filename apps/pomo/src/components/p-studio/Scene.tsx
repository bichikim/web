import {clientOnly} from '@solidjs/start'

export const PStudioScene = clientOnly(() => import('../PSceneCanvas'), {
  lazy: true,
})
