import {QBtn, QItem, QItemLabel, QItemSection, QList, QToggle} from 'src/quasar'
import {setName} from 'src/store/bucket'
import {posts} from 'src/store/posts'
import {user} from 'src/store/user'
import {computed, defineComponent, ref} from 'vue'
import {Box} from 'src/components/Box'
import {RouterLink} from 'vue-router'

const IndexPage = defineComponent({
  setup() {
    const userName = computed(() => {
      return user.name
    })
    const postList = computed(() => {
      return posts.list
    })

    const addItem = () => {
      posts.$.addItem({id: `add ${postList.value.length}`})
    }

    // eslint-disable-next-line unicorn/consistent-function-scoping
    const setBucketName = () => {
      setName.$('add')
    }

    // eslint-disable-next-line unicorn/consistent-function-scoping
    const addName = () => {
      user.name += '1'
    }

    const toggle = ref(false)
    return () => {
      return (
        <div>
          <QList>
            <QItem v-stitches={[{color: '$red1'}]}>
              <QItemSection>
                <QItemLabel>hello</QItemLabel>
                <QItemLabel caption={true}>greeting</QItemLabel>
              </QItemSection>
              <QItemSection side={true}>
                <QToggle v-model={toggle.value} />
              </QItemSection>
            </QItem>
          </QList>
          <Box css={{bg: 'green', color: 'red', m: 10, p: 10}}>
            <Box>
              index red
            </Box>
          </Box>
          <RouterLink to={'/sec'}>
            <QBtn>gogo</QBtn>
          </RouterLink>
          <div>{userName.value}</div>
          {postList.value.map((item) => {
            return <div key={item.id}>{`id ${item.id}`}</div>
          })}
          <QBtn onClick={addItem}>add Item</QBtn>
          <QBtn onClick={addName}>add Name</QBtn>
          <QBtn onClick={setBucketName}>set Name</QBtn>
        </div>
      )
    }
  },
})

export default IndexPage
