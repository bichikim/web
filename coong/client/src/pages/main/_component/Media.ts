import {QImg, QVideo} from 'quasar'
import {defineComponent, h, PropType} from 'vue'

export type MediaType = 'image' | 'video'
export type MediaMode = 'inline' | 'box'

export const Media = defineComponent({
  props: {
    format: {type: String},
    mode: {type: String as PropType<MediaMode>},
    type: {type: String as PropType<MediaType>},
    url: {type: String},
  },
  setup: (props) => {
    return () => {
      if (props.type === 'video') {
        return (
          h(QVideo, {src: props.url})
        )
      }
      return (
        h(QImg, {src: props.url})
      )
    }
  },
})
