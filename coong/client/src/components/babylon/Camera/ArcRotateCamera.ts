import * as Babylon from 'babylonjs'
import {defineComponent, PropType, provide, shallowRef, ShallowRef, toRefs, watchEffect} from 'vue'
import {useScene} from '../Scene'
import {useEngine} from '../Engine'
import {camaraKey} from './context'

export const provideArcRotateCamera = (
  name: string,
  scene: ShallowRef<Babylon.Scene | undefined>,
  alpha: number, beta: number, radius: number,
  target: Babylon.Vector3,
  // eslint-disable-next-line max-params
): ShallowRef<undefined | Babylon.ArcRotateCamera> => {
  const camera = shallowRef()

  watchEffect(() => {
    const sceneValue = scene.value
    if (sceneValue) {
      camera.value = new Babylon.ArcRotateCamera(name, alpha, beta, radius, target, sceneValue)
    }
  })

  provide(camaraKey, camera)
  return camera
}

export const ArcRotateCamera = defineComponent({
  name: 'ArcRotateCamera',
  props: {
    alpha: {default: 0, type: Number},
    beta: {default: 0, type: Number},
    controlElement: {type: Object},
    isControl: {default: true, type: Boolean},
    name: {default: 'camera', type: String},
    radius: {default: 3, type: Number},
    target: {default: () => (new Babylon.Vector3(0, 0, 0)), type: Object as PropType<Babylon.Vector3>},
  },
  render() {
    const {$slots} = this
    return $slots.default?.()
  },
  setup(props) {
    const {target, name, alpha, beta, radius, isControl, controlElement} = toRefs(props)
    const scene = useScene()
    const engineMeta = useEngine()
    const camera = provideArcRotateCamera(name.value, scene, alpha.value, beta.value, radius.value, target.value)

    watchEffect(() => {
      const cameraValue = camera.value
      const engineValue = engineMeta.engine
      const isControlValue = isControl.value
      if (cameraValue && engineValue) {
        const handle = controlElement.value ?? engineValue.getRenderingCanvas()
        if (isControlValue) {
          cameraValue.attachControl(handle, true)
        } else {
          cameraValue.detachControl()
        }
      }
    })

    return {
      camera,
    }
  },
})
