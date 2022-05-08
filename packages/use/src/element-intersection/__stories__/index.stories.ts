import {onElementIntersection, useElementIntersection} from 'src/element-intersection'
import {defineComponent, h, ref} from 'vue-demi'

export const Default = () => {
  const Component = defineComponent({
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

  return {
    setup() {
      return () => h('div', {style: {height: '200px'}}, [
        h(Component, () => [
          h('div', {style: {backgroundColor: 'blue', height: '100%', width: '100%'}}),
        ]),
        h(Component, () => [
          h('div', {style: {backgroundColor: 'blue', height: '100%', width: '100%'}}),
        ]),
        h(Component, () => [
          h('div', {style: {backgroundColor: 'blue', height: '100%', width: '100%'}}),
        ]),
        h(Component, () => [
          h('div', {style: {backgroundColor: 'blue', height: '100%', width: '100%'}}),
        ]),
        h(Component, () => [
          h('div', {style: {backgroundColor: 'blue', height: '100%', width: '100%'}}),
        ]),
        h(Component, () => [
          h('div', {style: {backgroundColor: 'blue', height: '100%', width: '100%'}}),
        ]),
        h(Component, () => [
          h('div', {style: {backgroundColor: 'blue', height: '100%', width: '100%'}}),
        ]),
        h(Component, () => [
          h('div', {style: {backgroundColor: 'blue', height: '100%', width: '100%'}}),
        ]),
        h(Component, () => [
          h('div', {style: {backgroundColor: 'blue', height: '100%', width: '100%'}}),
        ]),
        h(Component, () => [
          h('div', {style: {backgroundColor: 'blue', height: '100%', width: '100%'}}),
        ]),
        h(Component, () => [
          h('div', {style: {backgroundColor: 'blue', height: '100%', width: '100%'}}),
        ]),
        h(Component, () => [
          h('div', {style: {backgroundColor: 'blue', height: '100%', width: '100%'}}),
        ]),
        h(Component, () => [
          h('div', {style: {backgroundColor: 'blue', height: '100%', width: '100%'}}),
        ]),
        h(Component, () => [
          h('div', {style: {backgroundColor: 'blue', height: '100%', width: '100%'}}),
        ]),
      ])
    },
  }
}

export const Use = () => {
  const UseComponent = defineComponent({
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

  return {
    setup() {
      return () => h('div', {style: {height: '200px'}}, [
        h(UseComponent, () => [
          h('div', {style: {backgroundColor: 'blue', height: '100%', width: '100%'}}),
        ]),
        h(UseComponent, () => [
          h('div', {style: {backgroundColor: 'blue', height: '100%', width: '100%'}}),
        ]),
        h(UseComponent, () => [
          h('div', {style: {backgroundColor: 'blue', height: '100%', width: '100%'}}),
        ]),
        h(UseComponent, () => [
          h('div', {style: {backgroundColor: 'blue', height: '100%', width: '100%'}}),
        ]),
        h(UseComponent, () => [
          h('div', {style: {backgroundColor: 'blue', height: '100%', width: '100%'}}),
        ]),
        h(UseComponent, () => [
          h('div', {style: {backgroundColor: 'blue', height: '100%', width: '100%'}}),
        ]),
        h(UseComponent, () => [
          h('div', {style: {backgroundColor: 'blue', height: '100%', width: '100%'}}),
        ]),
        h(UseComponent, () => [
          h('div', {style: {backgroundColor: 'blue', height: '100%', width: '100%'}}),
        ]),
      ])
    },
  }
}
