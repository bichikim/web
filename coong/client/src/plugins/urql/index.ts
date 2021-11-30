import urqlVue from '@urql/vue'
import {apiUrl} from 'src/environment'
import {user} from 'src/store/user'
import {Plugin} from 'vue'

const getToken = (): string | undefined => {
  return user.token
}

const getGraphqlApiUrl = () => {
  return `${apiUrl()}/graphql`
}

export const urql: Plugin = (app) => {
  app.use(urqlVue, {
    fetchOptions: () => {
      const token = getToken()
      return {
        headers: {authorization: token ? `Bearer ${token}` : ''},
      }
    },
    url: getGraphqlApiUrl(),
  })
}
