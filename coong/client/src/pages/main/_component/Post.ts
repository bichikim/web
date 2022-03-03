import {defineComponent, h, PropType} from 'vue'
import {QCard, QCardSection, QImg} from 'quasar'
import {Media, MediaType} from './Media'

export interface MediaProps {
  format?: string
  type: MediaType
  url: string
}

export const Post = defineComponent({
  props: {
    description: {default: 'unknown', type: String},
    media: {default: () => ([]), type: Array as PropType<MediaProps[]>},
    title: {default: 'unknown', type: String},
    titleMedia: {type: Object as PropType<MediaProps>},
  },
  setup: (props) => {
    return () => (
      h(QCard, () => [
        props.titleMedia ? h(Media, {...props.titleMedia}) : null,
        h(QImg, {}),
        h(QCardSection, () => [

        ]),
      ])
    )
  },
})
