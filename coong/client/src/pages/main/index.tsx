import {defineComponent, ref} from 'vue'
import {HBox, HBtn, HGlow, HPage} from '@winter-love/hyper-components'
import {debug} from 'hooks/debug'

// const foo = () => Promise.resolve('foo')

const IndexPage = defineComponent({
  name: 'IndexPage',
  setup: () => {
    // useWriteEl()
    const name = ref('foo')
    const count = ref(1)
    const count2 = ref(1)

    const onIncrease = () => {
      count.value += 1
    }

    const onIncrease2 = () => {
      count2.value += 1
    }

    // const yeah = await foo()
    debug({
      count,
      count2,
      name,
    })

    return () => (
      <HPage css={{color: 'red'}}>
        <HBox css={{bg: 'green'}}>{name.value}</HBox>
        <HBox css={{bg: 'green'}}>{count.value}</HBox>
        <HBox css={{bg: 'green'}}>{count2.value}</HBox>
        <HBtn onClick={onIncrease}>onIncrease</HBtn>
        <HBtn onClick={onIncrease2}>onIncrease2</HBtn>
        <HBox css={{dp: 'flex', jc: 'center'}}>
          <HGlow><HBox css={{bg: 'red', height: 50, width: 100}}>foo</HBox></HGlow>
        </HBox>
      </HPage>
    )
  },
})

export default IndexPage
