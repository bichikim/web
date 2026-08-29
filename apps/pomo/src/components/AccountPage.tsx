import {Title} from '@solidjs/meta'

import {TossAccount} from './user-auth/TossAccount'
import {WebAccount} from './user-auth/WebAccount'
import {ACCOUNT_CARD_CLASSES, ACCOUNT_PAGE_CLASSES} from './user-auth/styles'
import * as m from '@paraglide/message'
import {localizeHref} from '@paraglide/runtime'

export const AccountPage = () => (
  <main class={ACCOUNT_PAGE_CLASSES}>
    <Title>{m.account_title()}</Title>
    <section class={ACCOUNT_CARD_CLASSES}>
      <header class="mb-7">
        <a
          class="text-xs font-700 text-#e8bc88 no-underline hover:underline"
          href={localizeHref('/')}
        >
          {m.account_back()}
        </a>
        <p class="mb-0 mt-6 text-xs font-750 tracking-[0.24em] text-#e8bc88 uppercase">
          Pomo account
        </p>
        <h1 class="mb-0 mt-3 text-3xl font-800 tracking--0.03em">{m.account_heading()}</h1>
      </header>

      {import.meta.env.VITE_POMO_IS_APPS_IN_TOSS === 'true' ? <TossAccount /> : <WebAccount />}
    </section>
  </main>
)
