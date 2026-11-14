import {Link, Meta, Title} from '@solidjs/meta'
import {SERVICE_NAME, SERVICE_ORIGIN} from '../../config/service'

interface SPageMetadataProps {
  readonly title?: string
  readonly description?: string
  readonly path?: string
}

export function SPageMetadata(props: SPageMetadataProps) {
  const title = () => `${props.title ?? '사주와 타로, 캐릭터의 목소리로'} | ${SERVICE_NAME}`
  const description = () =>
    props.description ?? '나의 사주와 타로 풀이를 캐릭터의 목소리로 듣는 서비스, Fortune.'
  const url = () => new URL(props.path ?? '/', SERVICE_ORIGIN).href

  return (
    <>
      <Title>{title()}</Title>
      <Meta name="description" content={description()} />
      <Meta property="og:type" content="website" />
      <Meta property="og:title" content={title()} />
      <Meta property="og:description" content={description()} />
      <Meta property="og:url" content={url()} />
      <Meta property="og:site_name" content={SERVICE_NAME} />
      <Link rel="canonical" href={url()} />
    </>
  )
}
