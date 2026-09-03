import {cx} from 'class-variance-authority'
import {Tabs} from '@kobalte/core/tabs'
import {A} from '@solidjs/router'
import {createMemo, createResource, ErrorBoundary, Show, Suspense} from 'solid-js'

import {findLicenseGroup, type LicenseData, loadLicenseData} from 'src/features/licenses'

import * as m from '@paraglide/message'
import {CreditList} from './credits-settings/List'
import {type PMusicCredit, PMusicCredits} from './credits-settings/MusicCredits'
import {PSettingsSectionHeading} from './settings/SectionHeading'

const getMusicCredits = () =>
  [
    {
      artistName: 'Rainy Monday',
      contributorName: 'Bichi Kim',
      role: m.credits_music_role(),
    },
  ] satisfies ReadonlyArray<PMusicCredit>

const CREATOR_DETAILS_CLASS = cx(
  'm-0 grid gap-2 rounded-panel border border-solid border-content-border',
  'bg-content-surface px-4 py-3 text-sm',
)

const NOTICE_CLASS = cx(
  'rounded-panel border border-solid border-content-border bg-content-surface p-4',
  'text-xs leading-5 text-muted-foreground',
)

const LicenseCredits = (props: {readonly licenseData: LicenseData}) => {
  const openSourceLicenseGroup = createMemo(() =>
    findLicenseGroup(props.licenseData, 'core-software'),
  )
  const modelLicenseGroup = createMemo(() => findLicenseGroup(props.licenseData, 'models'))

  return (
    <>
      <section aria-labelledby="pomo-open-source-title" class="grid gap-3">
        <PSettingsSectionHeading title={m.credits_open_source()} titleId="pomo-open-source-title" />
        <CreditList entries={openSourceLicenseGroup().entries} />
      </section>

      <section aria-labelledby="pomo-model-credits-title" class="grid gap-3">
        <PSettingsSectionHeading title={m.credits_models()} titleId="pomo-model-credits-title" />
        <CreditList entries={modelLicenseGroup().entries} />
      </section>
    </>
  )
}

export const PCreditsSettings = () => {
  const [licenseData] = createResource(loadLicenseData)

  return (
    <Tabs.Content value="credits">
      <section class="grid gap-4.5 settings-compact:gap-4">
        <section aria-labelledby="pomo-creator-title" class="grid gap-3">
          <PSettingsSectionHeading
            divider="none"
            title={m.credits_creator()}
            titleId="pomo-creator-title"
          />
          <dl class={CREATOR_DETAILS_CLASS}>
            <div class="grid grid-cols-[7rem_minmax(0,1fr)] gap-3">
              <dt class="text-muted-foreground">{m.credits_creator_role()}</dt>
              <dd class="m-0 font-750 text-foreground">Bichi Kim</dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="pomo-music-credits-title" class="grid gap-3">
          <PSettingsSectionHeading title={m.credits_music()} titleId="pomo-music-credits-title" />
          <PMusicCredits entries={getMusicCredits()} />
        </section>

        <ErrorBoundary fallback={<p role="alert">{m.credits_load_error()}</p>}>
          <Suspense fallback={<p role="status">{m.app_loading()}</p>}>
            <Show keyed when={licenseData()}>
              {(data) => <LicenseCredits licenseData={data} />}
            </Show>
          </Suspense>
        </ErrorBoundary>

        <aside class={NOTICE_CLASS}>
          {m.credits_notice()}{' '}
          <A
            class="font-650 text-highlight underline underline-offset-3"
            href="/third-party-notices"
          >
            {m.credits_notice_link()}
          </A>
          {m.credits_notice_end()}
        </aside>
      </section>
    </Tabs.Content>
  )
}
