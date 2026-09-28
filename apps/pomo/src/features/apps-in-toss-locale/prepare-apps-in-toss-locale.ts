import {getTextDirection, type Locale, setLocale} from '@paraglide/runtime'

import {reportClientError} from '../client-error-reporter'
import {getInitialAppsInTossLocale} from './bootstrap'
import {createAppsInTossLocalePreparation} from './create-apps-in-toss-locale-preparation'

const updateDocumentLocale = (locale: Locale) => {
  document.documentElement.lang = locale
  document.documentElement.dir = getTextDirection(locale)
}

export const prepareAppsInTossLocale = createAppsInTossLocalePreparation({
  activateLocale: (locale) => setLocale(locale, {reload: false}),
  readLocale: getInitialAppsInTossLocale,
  reportError: (error) => {
    reportClientError(error, {feature: 'apps-in-toss-locale', source: 'direct'})
  },
  updateDocumentLocale,
})
