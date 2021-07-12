import {MayRef, wrapRef} from '@winter-love/use'
import {kebabCase} from 'lodash'
import {QBtn} from 'quasar'
import {
  computed, defineComponent, h, toRef,
} from 'vue'

const getInitail = (name) => {
  if (name.length < 2) {
    return name
  }

  const value = kebabCase(name).split('-').slice(0, 2)

  console.log(value)

  if (value.length === 1) {
    return value[0].slice(0, 2)
  }

  return value
}

const useInitial = (name: MayRef<string>) => {
  const nameRef = wrapRef(name)
  return computed(() => {
    return getInitail(nameRef.value)
  })
}

export const Hamburger = defineComponent({
  name: 'Hamburger',
  props: {
    // eslint-disable-next-line vue/require-default-prop
    avatar: {type: String},
    name: {default: 'Unknown', type: String},
  },
  setup: (props) => {

    const nameRef = toRef(props, 'name')
    const initailName = useInitial(nameRef)

    return () => (
      h(QBtn, {class: 'bg-primary', push: true}, () => initailName.value)
    )
  },
})
