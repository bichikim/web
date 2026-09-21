import {clientOnly} from '@solidjs/start'

export const WorldViewportCanvas = clientOnly(
  async () => {
    await import('@babylonjs/loaders/glTF')
    const {WorldCanvas} = await import('./WorldCanvas')
    return {default: WorldCanvas}
  },
  {lazy: true},
)
