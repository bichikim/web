import {defineComponent} from 'vue'
import {getPosts} from 'src/graphql'
import {useQuery} from '@urql/vue'

export const Main = defineComponent({
  setup() {
    const {data} = useQuery({query: getPosts})
    return () => (
      <div>
        {data.value?.posts.map((item) => {
          return (
            <div key={item.id}>
              <span>{item.title}</span>
              <span>{item.message}</span>
            </div>
          )
        })}
      </div>
    )
  },
})

export default Main
