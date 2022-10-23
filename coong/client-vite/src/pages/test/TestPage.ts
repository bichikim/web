import {defineComponent, h, ref} from 'vue'
import {useSizeRef} from '@winter-love/use'
import {styled} from '@winter-love/uni'

export const HTestPage = defineComponent({
  setup() {
    const itemRef = ref(null)
    const scrollRef = ref(null)

    const sizeRef = useSizeRef(itemRef, scrollRef)

    return () =>
      h('div', [
        h(
          'div',
          {
            class: 'scroll',
            ref: scrollRef,
          },
          h(
            'div',
            {class: 'container'},
            //
            h('div', {class: 'item', ref: itemRef}),
          ),
        ),
        h('div', {}, JSON.stringify(sizeRef.value)),
      ])
  },
})

export const TestPage = styled(HTestPage, {
  '& .container': {
    height: 10_000,
    left: 0,
    position: 'relative',
    top: 0,
    width: 10_000,
  },
  '& .item': {
    backgroundColor: 'red',
    height: 50,
    left: 400,
    position: 'absolute',
    top: 400,
    width: 50,
  },
  '& .scroll': {
    backgroundColor: '#eee',
    height: 400,
    overflow: 'auto',
    position: 'relative',
    width: 400,
  },
})
