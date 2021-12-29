import {defineComponent, h} from 'vue'
import {QBtn, QPage} from 'quasar'
// import {} from ''

export const GraphqlPage = defineComponent({
  name: 'GraphqlPage',
  render() {
    const {updateRequest, getRequest} = this
    return (
      h(QPage, {}, () => [
        h(QBtn, {onClick: getRequest}, () => 'get request'),
        h(QBtn, {onClick: updateRequest}, () => 'update request'),
      ])
    )
  },
  setup() {
    const updateRequest = () => {
      return ''
    }
    const getRequest = () => {
      return ''
    }
    return {
      getRequest,
      updateRequest,
    }
  },
})
