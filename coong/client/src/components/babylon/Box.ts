import * as Babylon from 'babylonjs'
import {defineComponent, shallowRef, watchEffect} from 'vue'
import {useScene} from './Scene'

export const Box = defineComponent({
  name: 'Box',
  render() {
    const {$slots} = this
    return $slots.default?.()
  },
  setup() {
    const scene = useScene()
    const box = shallowRef()

    watchEffect(() => {
      const sceneValue = scene.value
      if (sceneValue) {
        box.value = Babylon.MeshBuilder.CreateBox('box', {}, sceneValue)
      }
    })

    return {
      box,
    }
  },
})
