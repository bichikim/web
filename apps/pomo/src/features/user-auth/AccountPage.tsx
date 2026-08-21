import {Title} from '@solidjs/meta'

import {ACCOUNT_CARD_CLASSES, ACCOUNT_PAGE_CLASSES} from './styles'
import {TossAccount} from './TossAccount'
import {WebAccount} from './WebAccount'

export const AccountPage = () => (
  <main class={ACCOUNT_PAGE_CLASSES}>
    <Title>Pomo 계정</Title>
    <section class={ACCOUNT_CARD_CLASSES}>
      <header class="mb-7">
        <a class="text-xs font-700 text-#e8bc88 no-underline hover:underline" href="/">
          ← Pomo로 돌아가기
        </a>
        <p class="mb-0 mt-6 text-xs font-750 tracking-[0.24em] text-#e8bc88 uppercase">
          Pomo account
        </p>
        <h1 class="mb-0 mt-3 text-3xl font-800 tracking--0.03em">계정</h1>
      </header>

      {import.meta.env.POMO_IS_APPS_IN_TOSS ? <TossAccount /> : <WebAccount />}
    </section>
  </main>
)
