import type {ViewerLanguage} from './types'
import {isViewerLanguage} from './is-viewer-language'
import {DEFAULT_VIEWER_LANGUAGE} from './languages'

export const resolveViewerLanguage = (locale: string | undefined): ViewerLanguage => {
  if (locale === undefined) {
    return DEFAULT_VIEWER_LANGUAGE
  }
  try {
    const {language, region, script} = new Intl.Locale(locale.trim().replaceAll('_', '-'))
    if (language === 'zh') {
      if (script !== undefined) {
        return script === 'Hans' ? 'zh-CN' : DEFAULT_VIEWER_LANGUAGE
      }
      return ['TW', 'HK', 'MO'].includes(region ?? '') ? DEFAULT_VIEWER_LANGUAGE : 'zh-CN'
    }
    return isViewerLanguage(language) ? language : DEFAULT_VIEWER_LANGUAGE
  } catch {
    return DEFAULT_VIEWER_LANGUAGE
  }
}
