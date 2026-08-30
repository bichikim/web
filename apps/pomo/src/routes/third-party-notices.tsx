import {A} from '@solidjs/router'
import {cx} from 'class-variance-authority'
import {createResource, ErrorBoundary, For, Show, Suspense} from 'solid-js'

import {type LicenseData, loadLicenseData} from 'src/features/licenses'
import {NoticeGroupSection} from '../components/third-party-notices/GroupSection'
import {LINK_CLASSES} from '../components/third-party-notices/shared'

const MAIN_CLASSES = cx(
  'relative min-h-dvh overflow-x-hidden bg-#17131f px-5 py-10 text-#f8edf1',
  'xs:px-8 xs:py-16',
)
const BACKGROUND_CLASSES = cx(
  'pointer-events-none absolute inset-0',
  'bg-[radial-gradient(circle_at_50%_0%,#594560_0%,#2a2135_34%,#17131f_72%)]',
)
const PANEL_CLASSES = cx(
  'rounded-8 border border-white/10 bg-#211a2b/88 p-5',
  'shadow-[0_28px_100px_rgba(5,2,10,0.38)] backdrop-blur-xl xs:p-8 lg:p-10',
)

const ThirdPartyNoticesDocument = (props: {readonly licenseData: LicenseData}) => {
  return (
    <main class={MAIN_CLASSES}>
      <div class={BACKGROUND_CLASSES} />

      <div class="relative mx-auto grid w-full max-w-5xl gap-8">
        <A class="w-fit text-sm font-700 text-#d8cbd9 no-underline hover:text-white" href="/">
          ← Pomofi로 돌아가기
        </A>

        <header>
          <p class="m-0 text-xs font-750 tracking-[0.24em] text-#f2a7b8 uppercase">
            Third-party notices
          </p>
          <h1 class="mb-0 mt-4 max-w-3xl text-3xl font-800 tracking--0.04em xs:text-5xl xs:leading-tight">
            제3자 라이선스 및 배포 고지
          </h1>
          <p class="mb-0 mt-5 max-w-3xl text-sm leading-7 text-#d8cbd9 xs:text-base xs:leading-8">
            Pomofi가 배포하거나 기능 실행 중 내려받는 외부 소프트웨어와 공개 가중치 모델의 사용
            범위와 배포 조건을 안내합니다.
          </p>
          <p class="mb-0 mt-3 text-xs text-#a99cab">
            마지막 확인일 {props.licenseData.lastReviewed}
          </p>
        </header>

        <nav aria-label="제3자 라이선스 문서 목차" class="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <For each={props.licenseData.groups}>
            {(group) => (
              <a class={LINK_CLASSES} href={`#${group.id}`}>
                {group.title}
              </a>
            )}
          </For>
        </nav>

        <article class={PANEL_CLASSES}>
          <div class="grid gap-10">
            <For each={props.licenseData.groups}>
              {(group) => <NoticeGroupSection group={group} />}
            </For>

            <aside class="rounded-5 border border-#f2a7b8/20 bg-#f2a7b8/7 p-5" role="note">
              <h2 class="m-0 text-base font-750 text-#ffd4de">원문 라이선스 우선</h2>
              <p class="mb-0 mt-2 text-sm leading-6 text-#d8cbd9">
                이 페이지는 이해를 돕기 위한 배포 고지이며 법률 자문이나 원문 라이선스를 대체하지
                않습니다. 내용이 다르면 각 항목에 연결된 원문 라이선스가 우선합니다.
              </p>
            </aside>
          </div>
        </article>

        <footer class="flex flex-wrap items-center justify-between gap-3 text-xs text-#8f8297">
          <span>© Pomofi</span>
          <A class="font-650 text-#bdb2c4 no-underline hover:text-white" href="/">
            Pomofi로 돌아가기 →
          </A>
        </footer>
      </div>
    </main>
  )
}

export default function ThirdPartyNoticesPage() {
  const [licenseData] = createResource(loadLicenseData)

  return (
    <ErrorBoundary fallback={<p role="alert">라이선스 정보를 불러오지 못했습니다.</p>}>
      <Suspense fallback={<p role="status">라이선스 정보를 불러오는 중…</p>}>
        <Show keyed when={licenseData()}>
          {(data) => <ThirdPartyNoticesDocument licenseData={data} />}
        </Show>
      </Suspense>
    </ErrorBoundary>
  )
}
