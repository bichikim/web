import {createClient} from '@urql/vue'
import {getApiUrl} from 'src/env'

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
  url: getApiUrl(),
})
