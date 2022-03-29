import * as Babylon from '@babylonjs/core'
import {computed, defineComponent, PropType, provide, reactive, shallowRef, ShallowRef, toRefs, watchEffect} from 'vue'
import {useEngine} from '../Engine'
import {useScene} from '../Scene'
import {watchUpdate} from '../watch-update'
import {camaraKey} from './context'
import {controlCamera} from './control-camera'

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
    isControl: {default: false, type: Boolean},
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
    const engine = computed(() => engineMeta.engine)
    const camera = provideArcRotateCamera(name.value, scene, alpha.value, beta.value, radius.value, target.value)

    controlCamera(reactive({
      camera,
      controlElement,
      engine,
      isControl,
    }))

    watchUpdate(camera, (camera) => {
      camera.target.copyFrom(target.value)
    })

    // alpha
    watchUpdate(camera, (camera) => {
      camera.alpha = alpha.value
    })

    // beta
    watchUpdate(camera, (camera) => {
      camera.beta = beta.value
    })

    watchUpdate(camera, (camera) => {
      camera.beta = beta.value
    })

    return {
      camera,
    }
  },
})
