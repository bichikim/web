import {historyRef} from '../'
import {h, ref} from 'vue'

export const Default = () => ({
  setup() {
    const valueRef = ref('')
    const maxRef = ref(1)
    const changeHistoryRef = historyRef(valueRef, maxRef)
    function setValue(event) {
      valueRef.value = event.target.value
    }

    function changeMax(changeValue) {
      if (maxRef.value === 1 && changeValue < 0) {
        return
      }
      maxRef.value += changeValue
    }
    return () => (
      h('div', [
        h('div', `max history: ${maxRef.value}`),
        h('div', valueRef.value),
        changeHistoryRef.value.map((item, index) => {
          return h('div', {key: item + index}, item)
        }),
        h('input', {onchange: setValue}),
        h('button', {onclick: () => changeMax(1)}, 'upMax'),
        h('button', {onclick: () => changeMax(-1)}, 'downMax'),
      ])
    )
  },
})
