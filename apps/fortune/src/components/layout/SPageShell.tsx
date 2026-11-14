import {A} from '@solidjs/router'
import type {ParentProps} from 'solid-js'
import {SERVICE_NAME} from '../../config/service'

export function SPageShell(props: ParentProps) {
  return (
    <div class="mx-auto flex min-h-dvh max-w-6xl flex-col px-6 sm:px-10">
      <a class="fortune-focus sr-only focus:not-sr-only focus:mt-4 focus:self-start" href="#main">
        본문으로 건너뛰기
      </a>
      <header class="flex min-h-24 items-center justify-between gap-6 border-b border-[#e8e2dc]">
        <A
          class="fortune-focus flex items-center gap-2 text-xl font-semibold tracking-tight"
          href="/"
        >
          <span aria-hidden="true" class="text-[#65488a]">
            ✦
          </span>
          {SERVICE_NAME}
        </A>
        <nav aria-label="주 메뉴">
          <A
            class="fortune-focus rounded text-sm text-[#655d6c] hover:text-[#533773]"
            href="/about"
          >
            서비스 소개
          </A>
        </nav>
      </header>
      <main class="flex-1" id="main" tabindex="-1">
        {props.children}
      </main>
      <footer
        class="flex flex-wrap items-center justify-between gap-3 border-t border-[#e8e2dc]
          py-6 text-xs text-[#655d6c]"
      >
        <span>{SERVICE_NAME} · by Pomofi</span>
        <span>사주와 타로로 나를 돌아보는 시간</span>
      </footer>
    </div>
  )
}
