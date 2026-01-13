import {useHRouterName} from './HRouterName'
import {type NavigateOptions, useNavigate} from '@solidjs/router'

export interface NameNavigator {
  (name: string, options?: Partial<NavigateOptions>): void
  (delta: number): void
}

export const useNameNavigate = (): NameNavigator => {
  const routerName = useHRouterName()
  const navigate = useNavigate()

  return (name: string | number, options?: Partial<NavigateOptions>) => {
    if (typeof name === 'number') {
      navigate(name)

      return
    }

    const href = routerName()[name]

    if (href) {
      navigate(href, options)
    }
  }
}
