import {clientOnly} from '@solidjs/start'

export const PStudioScene = clientOnly(
  async () => {
    const {PSceneCanvas} = await import('./SceneCanvas')
    return {default: PSceneCanvas}
  },
  {
    lazy: true,
  },
)
