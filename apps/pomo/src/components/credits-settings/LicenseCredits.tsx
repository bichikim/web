import {createMemo} from 'solid-js'
import {findLicenseGroup, type LicenseData} from 'src/features/licenses'
import * as m from '@paraglide/message'
import {CreditList} from './List'
import {PSettingsSectionHeading} from '../settings/SectionHeading'

export const LicenseCredits = (props: {readonly licenseData: LicenseData}) => {
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
