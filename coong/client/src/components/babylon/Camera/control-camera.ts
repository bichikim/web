import {Camera, Engine} from '@babylonjs/core'
import {useBabylonDispose} from '../use-babylon-dispose'
import {computed, ComputedRef, UnwrapNestedRefs} from 'vue'
import {watchUpdate} from '../watch-update'

export interface ControlCameraOptions {
  camera: ComputedRef<undefined | Camera>
  controlElement: ComputedRef<undefined | any>
  engine: ComputedRef<undefined | Engine>
  isControl: ComputedRef<undefined | boolean>
}

export const controlCamera = (options: UnwrapNestedRefs<ControlCameraOptions>) => {
  const camera = computed(() => options.camera)
  const engine = computed(() => options.engine)
  const isControl = computed(() => options.isControl)
  const controlElement = computed(() => options.controlElement)

  watchUpdate([camera, engine], ([camera, engine]) => {
    const isControlValue = isControl.value
    const handle = controlElement.value ?? engine.getRenderingCanvas()
    if (isControlValue) {
      camera.attachControl(handle, true)
    } else {
      camera.detachControl()
    }
  })

  useBabylonDispose(camera)
}
