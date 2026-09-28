import type {Locale} from '@paraglide/runtime'

export interface CreateAppsInTossLocalePreparationOptions {
  readonly activateLocale: (locale: Locale) => Promise<void> | void
  readonly readLocale: () => Promise<Locale>
  readonly reportError: (error: unknown) => void
  readonly updateDocumentLocale: (locale: Locale) => void
}

/** Creates the ordered locale preparation operation for an active screen. */
export const createAppsInTossLocalePreparation =
  (options: CreateAppsInTossLocalePreparationOptions) =>
  async (isActive: () => boolean): Promise<void> => {
    try {
      const locale = await options.readLocale()

      if (!isActive()) {
        return
      }

      await options.activateLocale(locale)

      if (!isActive()) {
        return
      }

      options.updateDocumentLocale(locale)
    } catch (error: unknown) {
      options.reportError(error)
    }
  }
