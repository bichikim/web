import {getRequestEvent} from 'solid-js/web'
import {z} from 'zod'

const LICENSE_DATA_PATH = '/licenses.json'
const TRUSTED_LOCAL_HOSTNAMES = new Set(['127.0.0.1', 'localhost'])

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

const getLicenseDataUrl = (): string => {
  const requestUrlValue = getRequestEvent()?.request.url

  if (requestUrlValue === undefined) {
    return LICENSE_DATA_PATH
  }

  const requestUrl = new URL(requestUrlValue)
  const assetOrigin = new URL(import.meta.env.POMO_LICENSE_ASSET_ORIGIN)
  const canUseLocalOrigin =
    import.meta.env.POMO_ALLOW_LOCAL_ASSET_ORIGIN === 'true' &&
    TRUSTED_LOCAL_HOSTNAMES.has(requestUrl.hostname)
  const trustedOrigin =
    requestUrl.origin === assetOrigin.origin || canUseLocalOrigin ? requestUrl : assetOrigin

  return new URL(LICENSE_DATA_PATH, trustedOrigin).href
}

const parseLicenseData = (value: unknown): LicenseData => {
  const result = LICENSE_DATA_SCHEMA.safeParse(value)

  if (!result.success) {
    throw new Error('Invalid license data.', {cause: result.error})
  }

  return result.data
}

/** Fetches and validates the public Pomofi license manifest. */
export const loadLicenseData = async (): Promise<LicenseData> => {
  let response: Response

  try {
    response = await fetch(getLicenseDataUrl())
  } catch (error) {
    throw new Error('Failed to fetch license data.', {cause: error})
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch license data: ${response.status}`)
  }

  let value: unknown

  try {
    value = await response.json()
  } catch (error) {
    throw new Error('Failed to parse license data.', {cause: error})
  }

  return parseLicenseData(value)
}

export const findLicenseGroup = (licenseData: LicenseData, id: string): LicenseGroup => {
  const group = licenseData.groups.find((entry) => entry.id === id)

  if (group === undefined) {
    throw new Error(`License group not found: ${id}`)
  }

  return group
}
