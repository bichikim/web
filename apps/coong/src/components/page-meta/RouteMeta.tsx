import {useCurrentMatches, useLocation} from '@solidjs/router'
import {Accessor, createMemo} from 'solid-js'
import {PageMeta, type PageMetaProps, resolveAbsoluteUrl} from './PageMeta'

export const usePageMeta = (): Accessor<RouteDefinition['info']['meta'] | undefined> => {
  const matches = useCurrentMatches()
  const location = useLocation()

  const pageMeta = createMemo(() => {
    const route = matches()
    const routeDefinition = route.find((r) => r.path === location.pathname)
    return routeDefinition?.route.info?.meta
  })

  return pageMeta
}

export const RouteMeta = (props: PageMetaProps) => {
  const pageMeta = usePageMeta()

  const title = createMemo(() => props.title ?? pageMeta()?.title)
  const description = createMemo(() => props.description ?? pageMeta()?.description)
  const image = createMemo(() => resolveAbsoluteUrl(props.image ?? pageMeta()?.image))

  return <PageMeta title={title()} description={description()} image={image()} />
}
