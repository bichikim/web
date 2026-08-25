import {clientOnly} from '@solidjs/start'

export const PStudioScene = clientOnly(() => import('./SceneCanvas'), {
  lazy: true,
})
