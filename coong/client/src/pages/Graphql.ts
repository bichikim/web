import {computed, defineComponent} from 'vue'
import {QBtn, QPage} from 'quasar'
import {useGetPostsQuery} from 'src/graphql'

export const Graphql = defineComponent({
  components: {
    QBtn,
    QPage,
  },
  name: 'GraphqlPage',
  setup() {
    const getPosts = useGetPostsQuery()

    const isFetching = computed(() => {
      return getPosts.fetching.value
    })

    const fetchPosts = () => {
      getPosts.executeQuery()
    }

    return {
      fetchPosts,
      isFetching,
      posts: getPosts.data,
    }
  },
  template: `
    <q-page>
      <q-btn>hello</q-btn>
    </q-page>
  `,
})

export default Graphql
