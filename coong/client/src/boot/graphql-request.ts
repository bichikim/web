import {resolveUrl} from '@winter-love/utils'
import {GraphQLClient} from 'graphql-request'
import {boot} from 'quasar/wrappers'
import {apiUrl} from 'src/environment'
import {getSdk} from 'src/graphql'
import {inject, InjectionKey} from 'vue'

const GRAPHQL_CLIENT: InjectionKey<GraphQLClient> = Symbol('graphql-client')
const _client = new GraphQLClient(resolveUrl(apiUrl(), '/api/graphql'), {
  credentials: 'same-origin',
})
export const useRequest = () => {
  const client = inject(GRAPHQL_CLIENT) ?? _client
  return getSdk(client)
}

export default boot(({app}) => {
  app.provide(GRAPHQL_CLIENT, _client)
})
