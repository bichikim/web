import {defineComponent, onMounted} from 'vue'
import {Scene as ThreeScene} from 'three'
export const Scene = () => defineComponent({
  setup() {
    const scene = new ThreeScene()
  },
})
