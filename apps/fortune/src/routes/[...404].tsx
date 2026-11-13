import {Meta, Title} from '@solidjs/meta'
import {A} from '@solidjs/router'
import {HttpStatusCode} from '@solidjs/start'
import {SERVICE_NAME} from '../config/service'

export default function NotFound() {
  return (
    <section class="py-24">
      <HttpStatusCode code={404} />
      <Title>페이지를 찾을 수 없어요 | {SERVICE_NAME}</Title>
      <Meta name="robots" content="noindex" />
      <p class="mb-3 text-sm font-medium text-[#65488a]">404</p>
      <h1 class="mb-8 text-3xl font-semibold">페이지를 찾을 수 없어요</h1>
      <A class="fortune-link" href="/">
        처음으로 돌아가기
      </A>
    </section>
  )
}
