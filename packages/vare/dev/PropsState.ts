import {computed, defineComponent, h, reactive, ref, toRefs, watch} from 'vue'
import {usePropsState} from './store'

export const PropsState = defineComponent({
  name: 'PropsState',
  setup(props) {
    const name = ref('foo')
    const propsState = usePropsState({name})
    const nameRef = computed(() => propsState.name)
    const ageRef = computed(() => propsState.age)
    const onChange = () => {
      name.value = `${name.value}o`
    }
    return () => (
      h('div', [
        h('button', {onClick: onChange}, 'change'),
        h('button', {onClick: propsState.increaseAge}, 'change'),
        `${nameRef.value} age ${ageRef.value}`,
      ])
    )
  },
})
