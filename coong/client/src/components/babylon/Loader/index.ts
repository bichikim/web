import {SceneLoader} from '@babylonjs/core'
import '@babylonjs/loaders'
import {defineComponent, shallowRef} from 'vue'
import {useScene} from '../Scene'
import {watchUpdate} from '../watch-update'

export const Loader = defineComponent({
  name: 'Loader',
  render() {
    const {$slots} = this
    return $slots.default?.()
  },
  setup() {
    const scene = useScene()
    const mash = shallowRef()

    watchUpdate(scene, (scene) => {
      mash.value = SceneLoader.Append('/models/girl/', 'scene.gltf', scene)
    })
  },
})
