import {A, AnchorProps} from '@solidjs/router'
import {createMemo, splitProps} from 'solid-js'
import {useRouterName} from './RouterNameProvider'

export interface HAnchorProps extends Omit<AnchorProps, 'href'> {
  href?: string
  hrefName: string
}

export const HAnchor = (props: HAnchorProps) => {
  const routerName = useRouterName()
  const [innerProps, restProps] = splitProps(props, ['hrefName', 'href'])

  const href = createMemo(() => {
    const _href = innerProps.href
    const _routerName = routerName()

    if (_href) {
      return _href
    }

    const hrefByName = _routerName[innerProps.hrefName]

    if (hrefByName) {
      return hrefByName
    }

    return _href ?? ''
  })

  return <A {...restProps} href={href()} />
}
