import {computed, defineComponent, h} from 'vue'
import {QToolbar, QBtn} from 'quasar'
import {useNavigation} from '../hooks/navigation'
import {ComfortableBar} from './ComfortableBar'

export const Navigation = defineComponent({
  name: 'Navigation',
  emits: ['click:home'],
  render() {
    return (
      h(QToolbar, {class: ''}, () => [
        h('div', {class: 'q-gutter-md'}, [
          h(QBtn, {push: true, icon: 'eva-at-outline', class: 'bg-primary'}),
          h(ComfortableBar, {buttons: this.buttonsRef}),
        ]),
      ])
    )
  },
  setup() {
    const {eventBus, comfortableBarRef} = useNavigation()

    const buttonsRef = computed(() => {
      return comfortableBarRef.value.buttons
    })

    return {
      buttonsRef,
    }
  },
})
