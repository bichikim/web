import {createClient} from '@urql/vue'
import {apiUrl} from 'src/environment'
import {user} from 'src/store/user'
import {Plugin} from 'vue'

const getToken = (): string | undefined => {
  return user.token
}

const getGraphqlApiUrl = () => {
  return `${apiUrl()}/api/graphql`
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
