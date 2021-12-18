import {computed, defineComponent, provide, ShallowRef, toRefs} from 'vue'
import {useScene} from '../Scene'
import {camaraKey} from './context'
import Babylon from 'babylonjs'

export const provideArcRotateCamera = (
  name: string,
  scene: ShallowRef<Babylon.Scene | undefined>,
  alpha: number, beta: number, radius: number,
  target: Babylon.Vector3,
) => {
  const camera = computed(() => {
    const sceneValue = scene.value
    if (sceneValue) {
      return new Babylon.ArcRotateCamera(name, alpha, beta, radius, target, sceneValue)
    }
  })
  provide(camaraKey, camera)
}

export const ArcRotateCamera = defineComponent({
  props: {
    alpha: {type: Number, default: 0},
    beta: {type: Number, default: 0},
    radius: {type: Number, default: 0},
    name: {type: String, default: 'camera'},
    target: {type: Babylon.Vector3, default: () => (new Babylon.Vector3(0, 0, 0))},
  },
  setup(props) {
    const {target, name, alpha, beta, radius} = toRefs(props)
    const scene = useScene()
    const camera = provideArcRotateCamera(name.value, scene, alpha.value, beta.value, radius.value, target.value)
    return {
      camera,
    }
  },
  name: 'ArcRotateCamera',
})
