import {Tabs} from '@kobalte/core/tabs'
import {A} from '@solidjs/router'

import {modelLicenseGroup, openSourceLicenseGroup} from 'src/features/licenses'

import * as m from '@paraglide/message'
import {CreditList} from './credits-settings/List'
import {type PMusicCredit, PMusicCredits} from './credits-settings/MusicCredits'

const getMusicCredits = () =>
  [
    {
      artistName: 'Rainy Monday',
      contributorName: 'Bichi Kim',
      role: m.credits_music_role(),
    },
  ] satisfies ReadonlyArray<PMusicCredit>

export const PCreditsSettings = () => (
  <Tabs.Content value="credits">
    <section class="grid gap-7">
      <section aria-labelledby="pomo-creator-title">
        <h3 class="m-0 text-base font-750" id="pomo-creator-title">
          {m.credits_creator()}
        </h3>
        <dl class="mb-0 mt-3 grid gap-2 rounded-4 bg-secondary-soft p-4 text-sm">
          <div class="grid grid-cols-[7rem_minmax(0,1fr)] gap-3">
            <dt class="text-muted-foreground">{m.credits_creator_role()}</dt>
            <dd class="m-0 font-750 text-foreground">Bichi Kim</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="pomo-music-credits-title" class="grid gap-3">
        <h3 class="m-0 text-base font-750" id="pomo-music-credits-title">
          {m.credits_music()}
        </h3>
        <PMusicCredits entries={getMusicCredits()} />
      </section>

      <section aria-labelledby="pomo-open-source-title" class="grid gap-3">
        <h3 class="m-0 text-base font-750" id="pomo-open-source-title">
          {m.credits_open_source()}
        </h3>
        <CreditList entries={openSourceLicenseGroup.entries} />
      </section>

      <section aria-labelledby="pomo-model-credits-title" class="grid gap-3">
        <h3 class="m-0 text-base font-750" id="pomo-model-credits-title">
          {m.credits_models()}
        </h3>
        <CreditList entries={modelLicenseGroup.entries} />
      </section>

      <aside class="rounded-4 border border-solid border-border p-4 text-xs leading-5 text-muted-foreground">
        {m.credits_notice()}{' '}
        <A class="font-650 text-highlight underline underline-offset-3" href="/third-party-notices">
          {m.credits_notice_link()}
        </A>
        {m.credits_notice_end()}
      </aside>
    </section>
  </Tabs.Content>
)
