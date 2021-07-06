import {TroisJSVuePlugin} from 'troisjs'
import {BootCallback, BootFileParams} from '@quasar/app'
const threeBoot: BootCallback<any> = (context: BootFileParams<any>) => {
  const {app} = context

  app.use(TroisJSVuePlugin as any)
}

export default threeBoot
