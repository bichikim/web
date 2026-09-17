import {z} from 'zod'

import {loadPublicJson, type PublicAssetPath} from 'src/features/public-assets'

const LICENSE_DATA_PATH: PublicAssetPath = '/licenses.json'

const LICENSE_LINK_SCHEMA = z.object({
  label: z.string(),
  url: z.string(),
})
const LICENSE_ENTRY_SCHEMA = z.object({
  condition: z.string(),
  license: z.string(),
  links: z.array(LICENSE_LINK_SCHEMA),
  name: z.string(),
  summaryName: z.string().optional(),
  use: z.string(),
})
const LICENSE_GROUP_SCHEMA = z.object({
  description: z.string(),
  entries: z.array(LICENSE_ENTRY_SCHEMA),
  id: z.string(),
  summaryTitle: z.string(),
  title: z.string(),
})
const LICENSE_DATA_SCHEMA = z.object({
  groups: z.array(LICENSE_GROUP_SCHEMA),
  lastReviewed: z.string(),
})

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

export interface LicenseData {
  readonly groups: ReadonlyArray<LicenseGroup>
  readonly lastReviewed: string
}

/** Fetches and validates the public Pomofi license manifest. */
export const loadLicenseData = (): Promise<LicenseData> =>
  loadPublicJson(LICENSE_DATA_PATH, LICENSE_DATA_SCHEMA, {
    formatFetchFailure: ({status}) =>
      status === undefined
        ? 'Failed to fetch license data.'
        : `Failed to fetch license data: ${status}`,
    formatInvalid: () => 'Invalid license data.',
    formatParseFailure: () => 'Failed to parse license data.',
  })

export const findLicenseGroup = (licenseData: LicenseData, id: string): LicenseGroup => {
  const group = licenseData.groups.find((entry) => entry.id === id)

  if (group === undefined) {
    throw new Error(`License group not found: ${id}`)
  }

  return group
}
