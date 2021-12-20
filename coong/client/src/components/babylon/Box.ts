import * as Babylon from 'babylonjs'
import {defineComponent, shallowRef, watch} from 'vue'
import {useScene} from './Scene'

export const Box = defineComponent({
  name: 'Box',
  render() {
    const {$slots} = this
    return $slots.default?.()
  },
  setup() {
    const scene = useScene()
    const box = shallowRef<undefined | Babylon.Mesh>()

    watch(scene, (scene) => {
      const boxValue = box.value
      if (boxValue) {
        boxValue.dispose()
      }
      box.value = Babylon.MeshBuilder.CreateBox('box', {}, scene)
    })

    return {
      box,
    }
  },
})
