import UilSetting from '~icons/uil/setting'
import {defineComponent, h} from 'vue'
export const HOptionButton = defineComponent({
  emits: ['click'],
  setup: (_, {emit}) => {
    const onClick = () => {
      emit('click')
    }
    return () =>
      h('button', {class: 'bg-transparent text-black b-none', onClick}, [
        //
        h(UilSetting, {class: 'text-1.5rem cursor-pointer'}),
      ])
  },
})
