import * as Babylon from '@babylonjs/core'
import {computed, defineComponent, PropType, provide, reactive, shallowRef, ShallowRef, toRefs, watchEffect} from 'vue'
import {useEngine} from '../Engine'
import {useScene} from '../Scene'
import {watchUpdate} from '../watch-update'
import {camaraKey} from './context'
import {controlCamera} from './control-camera'

export type CameraType = 'ArcRotateCamera' | 'Camera'

export const provideCamera = (
  name: string,
  vector: Babylon.Vector3,
  scene: ShallowRef<Babylon.Scene | undefined>,
): ShallowRef<undefined | Babylon.Camera> => {
  const camera = shallowRef()

  watchEffect(() => {
    const sceneValue = scene.value
    if (sceneValue) {
      camera.value = new Babylon.Camera(name, vector, sceneValue)
    }
  })

  provide(camaraKey, camera)

  return camera
}

export const Camera = defineComponent({
  name: 'Camera',
  props: {
    controlElement: {type: Object},
    isControl: {default: true, type: Boolean},
    name: {default: 'camera', type: String},
    position: {default: () => (new Babylon.Vector3(0, 0, 0)), type: Object as PropType<Babylon.Vector3>},
  },
  render() {
    const {$slots} = this
    return $slots.default?.()
  },
  setup(props) {
    const {position, name, isControl, controlElement} = toRefs(props)
    const engineMeta = useEngine()
    const engine = computed(() => engineMeta.engine)
    const scene = useScene()
    const camera = provideCamera(name.value, position.value, scene)

    controlCamera(reactive({
      camera,
      controlElement,
      engine,
      isControl,
    }))

    watchUpdate(camera, (camera) => {
      camera.position.copyFrom(position.value)
      camera.attachControl()
    })

    return {
      camera,
    }
  },
})

