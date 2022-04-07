import {HBox, HCard} from '@winter-love/hyper-components'
import {defineComponent, PropType} from 'vue'
import {MediaType} from './Media'

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
      <HCard>
        <HBox>{props.title}</HBox>
      </HCard>
    )
  },
})
