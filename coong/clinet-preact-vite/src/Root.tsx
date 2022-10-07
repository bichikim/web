import {Router} from './Router'
import {UrqlProvider} from 'src/graphql'
export const Root = () => (
  <UrqlProvider>
    <Router />
  </UrqlProvider>
)
