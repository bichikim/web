import {defineComponent, h, ref} from 'vue-demi'
import {onElementIntersection} from '../'

export const Component = defineComponent({
  setup(props, {slots}) {
    const threshold = 0.05
    const elementRef = ref()
    const showRef = ref(false)

    onElementIntersection(elementRef, (entries) => {
      const shouldClose = entries.some((entry) => {
        return entry.intersectionRatio < threshold
      })

      if (shouldClose) {
        showRef.value = false
        return
      }

      const shouldShow = entries.some((entry) => {
        return entry.intersectionRatio >= threshold
      })

      if (shouldShow) {
        showRef.value = true
      }
    }, {
      threshold,
    })

    return () => (
      h('div', {
        ref: elementRef,
        style: {backgroundColor: 'red', height: '100px', marginBottom: '10px', width: '100%'},
      }, showRef.value ? slots.default?.() : undefined)
    )
  },
})
