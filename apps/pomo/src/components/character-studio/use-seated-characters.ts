import type {AssetContainer} from '@babylonjs/core/assetContainer'
import {LoadAssetContainerAsync} from '@babylonjs/core/Loading/sceneLoader'
import type {Scene} from '@babylonjs/core/scene'
import {createEffect, createSignal, onCleanup, untrack} from 'solid-js'
import {reportClientError} from '../../features/client-error-reporter'
import {applyExpressions, type ExpressionSettings} from './expressions'
import {applyFaceDeformation, type FaceSettings} from './face-deformation'
import {seatCharacter} from './seated-pose'
import {mountGarmentPhysics} from './garment-physics'
import {mountClothContact} from './cloth-contact'

interface SeatedOptions {
  readonly seatedCharacters?: readonly string[]
  readonly modelUrl: string
  readonly expressions?: ExpressionSettings
  readonly faceSettings?: FaceSettings
  readonly onLoadStart: () => void
  readonly onLoadSuccess: () => void
  readonly onLoadError: () => void
}

export const useSeatedCharacters = (scene: Scene, options: SeatedOptions) => {
  createEffect(() => {
    const urls = options.seatedCharacters
    if (urls === undefined) {
      return
    }
    const [occupants, setOccupants] = createSignal(new Map<string, AssetContainer>())
    let disposed = false
    const cleanups: Array<() => void> = []
    untrack(() => options.onLoadStart())
    Promise.all(
      urls.map(async (url, index) => {
        const container = await LoadAssetContainerAsync(url, scene, {pluginExtension: '.glb'})
        if (disposed) {
          container.dispose()
          return
        }
        const start = cleanups.length
        try {
          container.addAllToScene()
          cleanups.push(
            seatCharacter(container, index, () =>
              url === options.modelUrl ? (options.expressions?.blink ?? 0) : 0,
            ),
          )
          cleanups.push(mountGarmentPhysics(container, url))
          cleanups.push(mountClothContact(container, url))
          setOccupants((previous) => new Map(previous).set(url, container))
        } catch (error: unknown) {
          cleanups
            .splice(start)
            .toReversed()
            .forEach((dispose) => dispose())
          container.dispose()
          throw error
        }
      }),
    )
      .then(() => {
        if (!disposed) {
          options.onLoadSuccess()
        }
      })
      .catch((error: unknown) => {
        if (!disposed) {
          reportClientError(error, {feature: 'seated-characters', source: 'direct'})
          options.onLoadError()
        }
      })
    createEffect(() => {
      const container = occupants().get(options.modelUrl) ?? null
      applyExpressions(container, options.expressions)
      applyFaceDeformation(container, options.faceSettings)
    })
    onCleanup(() => {
      disposed = true
      cleanups.toReversed().forEach((dispose) => dispose())
      occupants().forEach((container) => container.dispose())
    })
  })
}
