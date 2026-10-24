// meta component
import {Meta, Title} from '@solidjs/meta'
import {useLocation} from '@solidjs/router'
import {createMemo, Show} from 'solid-js'
import {getSelfUrl} from 'src/env'

export interface PageMetaProps {
  description?: string
  image?: string
  title?: string
}

export const resolveAbsoluteUrl = (value: string | undefined) => {
  if (!value) {
    return undefined
  }

  if (/^https?:\/\//u.test(value)) {
    return value
  }

  const baseUrl = getSelfUrl().replace(/\/$/u, '')
  const path = value.startsWith('/') ? value : `/${value}`

  return `${baseUrl}${path}`
}

export const PageMeta = (props: PageMetaProps) => {
  const location = useLocation()
  const pageUrl = createMemo(() => resolveAbsoluteUrl(location.pathname))

  return (
    <>
      <Title>Coong - {props.title}</Title>
      <Meta property="og:site_name" content={props.title} />
      <Meta property="og:title" content={props.title} />
      <Meta property="og:description" content={props.description} />
      <Meta property="og:url" content={pageUrl()} />
      <Show when={props.image}>
        <Meta property="og:image" content={props.image} />
      </Show>
    </>
  )
}
