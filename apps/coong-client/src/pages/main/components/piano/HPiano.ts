import {computed, defineComponent, h, onMounted, ref} from 'vue'
import {HPianoFlat} from './HPianoFlat'
import {HPianoSharp} from './HPianoSharp'
import {HLoading} from './HLoading'
import {HUNDRED} from '@winter-love/utils'
import {createSplendidGrandPiano} from 'src/instruments/splendid-grand-piano'

export const HPiano = defineComponent({
  name: 'HPiano',
  props: {
    scale: {default: 100, type: Number},
  },
  setup: (props) => {
    const rootElement = ref()
    const style = computed(() => {
      const _scale = props.scale
      const height = rootElement.value?.clientHeight ?? 0
      return {
        marginBottom: `calc(-${height}px * (1 - ${_scale / HUNDRED}))`,
        transform: `scale(${_scale / HUNDRED})`,
      }
    })

    const loaded = ref(false)
    const piano = createSplendidGrandPiano()

    onMounted(async () => {
      await piano.load
      loaded.value = true
    })

    const onDown = (key: string | number) => {
      piano.start(key)
    }

    const onUp = (key: string | number) => {
      piano.stop(key)
    }

    return () =>
      h(
        'section',
        {
          class: 'h-full max-h-466px pointer-events-none relative origin-top-left',
          ref: rootElement,
          style: style.value,
        },
        [
          //
          h(HPianoFlat, {class: 'flat', disabled: !loaded.value, onDown, onUp}),
          h(HPianoSharp, {
            class: 'sharp absolute top-0',
            disabled: !loaded.value,
            onDown,
            onUp,
          }),
          loaded.value ||
            h(HLoading, {class: 'absolute bottom-0 left-0 pb-40px pl-10px font-bold'}),
        ],
      )
  },
})
