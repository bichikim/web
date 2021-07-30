import {defineComponent, h, ref} from 'vue-demi'
import {useElementIntersection} from '../'

export const UseComponent = defineComponent({
  setup(props, {slots}) {
    const elementRef = ref()
    const showRef = useElementIntersection(elementRef)

    return () => (
      h('div', {
        ref: elementRef,
        style: {backgroundColor: 'red', height: '100px', marginBottom: '10px', width: '100%'},
      }, showRef.value ? slots.default?.() : undefined)
    )
  },
})
