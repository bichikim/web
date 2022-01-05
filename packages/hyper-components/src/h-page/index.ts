import {defineComponent, h} from 'vue-demi'
import {QPage} from 'quasar'

const styleFn = (offset, height) => {
  const contentHeight = `${height - offset}px`
  return {
    '--content-height': contentHeight,
    '--height': `${height}px`,
    '--offset': `${offset}px`,
    minHeight: contentHeight,
  }
}

export const HPage = defineComponent({
  name: 'HPage',
  render() {
    return (
      h(QPage, {styleFn}, this.$slots)
    )
  },
  setup() {
    return {}
  },
})
