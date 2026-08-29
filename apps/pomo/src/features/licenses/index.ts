import licenses from 'src/data/licenses'

export interface LicenseLink {
  readonly label: string
  readonly url: string
}

export interface LicenseEntry {
  readonly condition: string
  readonly license: string
  readonly links: ReadonlyArray<LicenseLink>
  readonly name: string
  readonly summaryName?: string
  readonly use: string
}

export interface LicenseGroup {
  readonly description: string
  readonly entries: ReadonlyArray<LicenseEntry>
  readonly id: string
  readonly summaryTitle: string
  readonly title: string
}

interface LicenseData {
  readonly groups: ReadonlyArray<LicenseGroup>
  readonly lastReviewed: string
}

export const licenseData = licenses satisfies LicenseData

const findLicenseGroup = (id: string): LicenseGroup => {
  const group = licenseData.groups.find((entry) => entry.id === id)

  if (group === undefined) {
    throw new Error(`License group not found: ${id}`)
  }

  return group
}

export const openSourceLicenseGroup = findLicenseGroup('core-software')
export const modelLicenseGroup = findLicenseGroup('models')
