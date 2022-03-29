import {createClient} from '@urql/vue'
import {apiUrl} from 'src/environment'
import {user} from 'src/store/user'
import {Plugin} from 'vue'
import {resolveUrl} from '@winter-love/utils'

const getToken = (): string | undefined => {
  return user.token
}

const getGraphqlApiUrl = () => {
  return resolveUrl(apiUrl(), '/api/graphql')
}

export const client = createClient({
  fetchOptions: () => {
    const token = getToken()
    return {
      credentials: 'same-origin',
      headers: {authorization: token ? `Bearer ${token}` : ''},
    }
  },
  url: getGraphqlApiUrl(),
})

const urql: Plugin = (app) => {
  app.provide('$urql', client)
}

export default urql
