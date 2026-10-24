import type {Locale} from '@paraglide/runtime'

export interface CreateAppsInTossLocalePreparationOptions {
  readonly activateLocale: (locale: Locale) => Promise<void> | void
  readonly readLocale: () => Promise<Locale>
  readonly reportError: (error: unknown) => void
  readonly updateDocumentLocale: (locale: Locale) => void
}

export type AppsInTossLocalePreparationResult =
  | {readonly status: 'cancelled'}
  | {readonly status: 'failed'}
  | {readonly status: 'prepared'}

/** Creates the ordered locale preparation operation for an active screen. */
export const createAppsInTossLocalePreparation =
  (options: CreateAppsInTossLocalePreparationOptions) =>
  async (isActive: () => boolean): Promise<AppsInTossLocalePreparationResult> => {
    try {
      const locale = await options.readLocale()

      if (!isActive()) {
        return {status: 'cancelled'}
      }

      await options.activateLocale(locale)

      if (!isActive()) {
        return {status: 'cancelled'}
      }

      options.updateDocumentLocale(locale)
      return {status: 'prepared'}
    } catch (error: unknown) {
      options.reportError(error)
      return {status: 'failed'}
    }
  }
