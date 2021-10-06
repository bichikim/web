import {computed, defineComponent, ref} from 'vue'
import {QBtn, QItem, QItemLabel, QItemSection, QList, QToggle} from 'src/quasar'
import {user} from 'src/store/user'
import {posts} from 'src/store/posts'

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
                <QToggle v-model={toggle.value}/>
              </QItemSection>
            </QItem>
          </QList>
          <div>{userName.value}</div>
          {postList.value.map((item) => {
            return <div key={item.id}>{`id ${item.id}`}</div>
          })}
          <QBtn onClick={addItem}>add Item</QBtn>
          <QBtn onClick={addName}>add Name</QBtn>
        </div>
      )
    }
  },
})

export default IndexPage
