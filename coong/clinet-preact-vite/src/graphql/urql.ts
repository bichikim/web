import {createClient, Provider} from '@urql/preact'
import {ComponentChildren, h} from 'preact'
import {env} from 'src/env'

const getToken = () => ''

export const client = createClient({
  fetchOptions: () => {
    const token = getToken()
    return {
      headers: {authorization: token ? `Bearer ${token}` : ''},
    }
  },
  url: env.apiUrl,
})

export interface UrqlProviderProps {
  children: ComponentChildren
}

export const UrqlProvider = (props) => {
  return h(Provider, {children: props.children, value: client})
}
