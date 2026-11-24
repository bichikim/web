import {Meta, Title} from '@solidjs/meta'
import {For} from 'solid-js'
import {downloadPath, installUrl, themes} from '../catalog'
import windowCover from '../../../wallpaper-web/public/wallpapers/ash-afternoon/window.webp?url'
import lemonCover from '../../../wallpaper-web/public/wallpapers/ash-afternoon/lemon-soda.webp?url'

const previews: Readonly<Record<string, string>> = {'lemon-soda': lemonCover, window: windowCover}

export default function Themes() {
  return (
    <main class="min-h-screen bg-paper pb-16 font-sans text-ink">
      <Title>Poffo Themes</Title>
      <Meta name="description" content="Wallpaper에 배경과 Poffo 위젯을 함께 적용하는 무료 테마." />
      <header class="page-width flex items-center justify-between gap-8 border-b border-ink/12 py-5">
        <a href="/" class="text-lg font-bold text-ink no-underline">
          Poffo Themes
        </a>
        <a href="#themes" class="quiet-link">
          무료 테마
        </a>
      </header>
      <section class="page-width grid items-end gap-5 pb-10 pt-12 sm:grid-cols-[1.4fr_1fr] sm:pt-19">
        <h1 class="page-title">
          오늘의 책상을
          <br />
          꾸며보세요
        </h1>
        <p class="m-0 max-w-88 break-keep text-base text-muted leading-relaxed sm:mb-2">
          배경과 캐릭터 위젯을 한 테마로. 마음에 드는 테마를 Wallpaper에서 열어 바로 적용할 수
          있어요.
        </p>
      </section>
      <section id="themes" aria-label="무료 테마" class="page-width grid gap-6 md:grid-cols-2">
        <For each={themes}>
          {(theme) => (
            <article aria-label={theme.name} class="overflow-hidden rounded-6 bg-white">
              <div class="aspect-video overflow-hidden">
                <img
                  src={previews[theme.preview]}
                  alt={`${theme.name} 배경 미리보기`}
                  class="block h-full w-full object-cover"
                />
              </div>
              <div class="p-6">
                <h2 class="m-0 text-2xl font-bold tracking-tight">{theme.name}</h2>
                <p class="mt-2 mb-0 text-sm text-muted leading-relaxed">{theme.description}</p>
                <div class="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
                  <a
                    href={installUrl(theme.slug)}
                    class="primary-link"
                    aria-label={`${theme.name} 받기`}
                  >
                    받기 · Wallpaper에서 열기
                  </a>
                  <a
                    href={downloadPath(theme.slug)}
                    download={`${theme.slug}.poffotheme`}
                    class="quiet-link"
                  >
                    파일 다운로드
                  </a>
                </div>
              </div>
            </article>
          )}
        </For>
      </section>
    </main>
  )
}
