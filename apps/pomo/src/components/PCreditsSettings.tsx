import {Tabs} from '@kobalte/core/tabs'
import {A} from '@solidjs/router'

import {modelLicenseGroup, openSourceLicenseGroup} from 'src/features/licenses'

import {CreditList} from './credits-settings/List'
import {type PMusicCredit, PMusicCredits} from './PMusicCredits'

const MUSIC_CREDITS = [
  {
    artistName: 'Rainy Monday',
    contributorName: 'Bichi Kim',
    role: '음악 제작',
  },
] satisfies ReadonlyArray<PMusicCredit>

export const PCreditsSettings = () => (
  <Tabs.Content value="credits">
    <section class="grid gap-7">
      <section aria-labelledby="pomo-creator-title">
        <h3 class="m-0 text-base font-750" id="pomo-creator-title">
          만든 사람
        </h3>
        <dl class="mb-0 mt-3 grid gap-2 rounded-4 bg-secondary-soft p-4 text-sm">
          <div class="grid grid-cols-[7rem_minmax(0,1fr)] gap-3">
            <dt class="text-muted-foreground">기획 · 디자인 · 개발</dt>
            <dd class="m-0 font-750 text-foreground">Bichi Kim</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="pomo-music-credits-title" class="grid gap-3">
        <h3 class="m-0 text-base font-750" id="pomo-music-credits-title">
          음악
        </h3>
        <PMusicCredits entries={MUSIC_CREDITS} />
      </section>

      <section aria-labelledby="pomo-open-source-title" class="grid gap-3">
        <h3 class="m-0 text-base font-750" id="pomo-open-source-title">
          {openSourceLicenseGroup.summaryTitle}
        </h3>
        <CreditList entries={openSourceLicenseGroup.entries} />
      </section>

      <section aria-labelledby="pomo-model-credits-title" class="grid gap-3">
        <h3 class="m-0 text-base font-750" id="pomo-model-credits-title">
          {modelLicenseGroup.summaryTitle}
        </h3>
        <CreditList entries={modelLicenseGroup.entries} />
      </section>

      <aside class="rounded-4 border border-solid border-border p-4 text-xs leading-5 text-muted-foreground">
        이 화면은 요약이며 원문 라이선스를 대체하지 않습니다. 전체 버전과 배포 조건은{' '}
        <A class="font-650 text-highlight underline underline-offset-3" href="/third-party-notices">
          제3자 라이선스 관리 문서
        </A>
        에서 확인할 수 있습니다.
      </aside>
    </section>
  </Tabs.Content>
)
