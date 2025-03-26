// meta component
import {Meta, Title} from '@solidjs/meta'
import {useLocation} from '@solidjs/router'
import {Show} from 'solid-js'

export interface PageMetaProps {
  description: string
  image?: string
  pageName: string
}

export const PageMeta = (props: PageMetaProps) => {
  const location = useLocation()

  return (
    <>
      <Title>Coong - {props.pageName}</Title>
      <Meta property="og:site_name" content={props.pageName} />
      <Meta property="og:title" content={props.pageName} />
      <Meta property="og:description" content={props.description} />
      <Meta property="og:url" content={location.pathname} />
      <Show when={props.image}>
        <Meta property="og:image" content={props.image} />
      </Show>
    </>
  )
}
