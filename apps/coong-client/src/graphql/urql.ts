import {Client, createClient} from '@urql/vue'
import {env} from 'src/env'

const getToken = (): string | undefined => ''

export const client: Client = createClient({
  fetchOptions: (): any => {
    const token = getToken()
    return {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    }
  },
  url: env.apiUrl,
} as any)
