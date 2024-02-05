import {defineComponent, h, ref} from 'vue'
import {HOptions, HPiano, HScrollAbleSign} from './components'

export const MainPage = defineComponent({
  name: 'HMainPage',
  setup() {
    const scale = ref(100)
    const onScale = (value: number) => {
      scale.value = value
    }
    return () =>
      h('main', {class: 'h-full overflow-y-hidden pt-0 px-2 flex flex-col'}, [
        //
        h(HPiano, {class: 'flex-none', scale: scale.value}),
        h(HScrollAbleSign, {class: 'mt-0'}),
        h(HOptions, {class: 'fixed bottom-0 right-0', onScale, scale: scale.value}),
      ])
  },
})

/// https://github.com/Tonejs/Tone.js/issues/111
/// https://danigb.github.io/smplr/
