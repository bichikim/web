import * as Babylon from '@babylonjs/core'
import {
  computed,
  defineComponent,
  h,
  inject,
  InjectionKey,
  onBeforeUnmount,
  provide,
  reactive,
  ref,
  shallowRef,
  ShallowRef,
  watchEffect,
} from 'vue'
import {watchUpdate} from './watch-update'

export interface EngineMeta {
  engine?: Babylon.Engine
}

export const engineKey: InjectionKey<EngineMeta> = Symbol('babylon-engine')

export const useEngine = (): EngineMeta => {
  return inject(engineKey, reactive({}))
}

export const provideEngine = (
  canvas: ShallowRef<HTMLCanvasElement | undefined>,
) => {
  const engine = shallowRef<undefined | Babylon.Engine>()

  watchEffect(async () => {
    const canvasValue = canvas.value
    if (!canvasValue) {
      return
    }

    engine.value = new Babylon.Engine(canvasValue, true)
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
    const engine = computed(() => {
      return engineMeta.engine
    })

    watchUpdate(engine, (engine) => {
      engine.runRenderLoop(() => {
        engine.scenes.forEach((scene) => scene.render())
      })
    })

    onBeforeUnmount(() => {
      const engineValue = engine.value
      if (engineValue) {
        engineValue.stopRenderLoop()
      }
    })

    return {
      engineMeta,
      root,
    }
  },
})

