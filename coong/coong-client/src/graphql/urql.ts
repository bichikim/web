import {createClient} from '@urql/vue'
import {env} from 'src/env'

const getToken = (): string | undefined => ''

export const client = createClient({
  fetchOptions: () => {
    const token = getToken()
    return {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    }
  },
  url: env.apiUrl,
})
