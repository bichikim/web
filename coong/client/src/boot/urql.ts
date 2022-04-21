import {boot} from 'quasar/wrappers'
import {createClient, install} from '@urql/vue'
import {apiUrl} from 'src/environment'
import {resolveUrl} from '@winter-love/utils'
const getGraphqlApiUrl = () => {
  return resolveUrl(apiUrl(), '/api/graphql')
}

export const client = createClient({
  fetchOptions: () => {
    // const token = getToken()
    return {
      credentials: 'same-origin',
      // headers: {authorization: token ? `Bearer ${token}` : ''},
    }
  },
  url: getGraphqlApiUrl(),
})

export default boot(({app}) => {
  (install as any)(app, client)
})
