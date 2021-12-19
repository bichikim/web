import * as Babylon from 'babylonjs'
import {
  defineComponent,
  h,
  inject,
  InjectionKey,
  provide,
  reactive,
  ref,
  ShallowRef,
  shallowRef,
  watchEffect,
} from 'vue'

export interface EngineMeta {
  engine?: Babylon.Engine
}

export const engineKey: InjectionKey<EngineMeta> = Symbol('babylon-engine')

export const useEngine = (): EngineMeta => {
  return inject(engineKey, reactive({}))
}

export const provideEngine = (canvas: ShallowRef<HTMLCanvasElement | undefined>) => {
  const engine = shallowRef()

  watchEffect(() => {
    const canvasValue = canvas.value
    if (canvasValue) {
      engine.value = new Babylon.Engine(canvasValue, true)
    }
  })

  const result = reactive({
    engine,
  })

  provide(engineKey, result)
  return result
}

export const Engine = defineComponent({
  name: 'Engine',
  props: {
    antialias: {default: true, type: Boolean},
  },
  render() {
    const {$slots} = this
    return (
      h('canvas', {ref: 'root'}, $slots.default?.())
    )
  },
  setup() {
    const root = ref()
    const engineMeta = provideEngine(root)

    watchEffect(() => {
      const engineValue = engineMeta.engine
      if (engineValue) {
        engineValue.runRenderLoop(() => {
          engineValue.scenes.forEach((scene) => scene.render())
        })
      }
    })

    return {
      engineMeta,
      root,
    }
  },
})

