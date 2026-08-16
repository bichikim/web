export const SUPERTONIC_LANGUAGES = [
  'ar',
  'bg',
  'cs',
  'da',
  'de',
  'el',
  'en',
  'es',
  'et',
  'fi',
  'fr',
  'hi',
  'hr',
  'hu',
  'id',
  'it',
  'ja',
  'ko',
  'lt',
  'lv',
  'na',
  'nl',
  'pl',
  'pt',
  'ro',
  'ru',
  'sk',
  'sl',
  'sv',
  'tr',
  'uk',
  'vi',
] as const

export type SupertonicLanguage = (typeof SUPERTONIC_LANGUAGES)[number]

export interface SupertonicLanguageOption {
  readonly label: string
  readonly value: SupertonicLanguage
}

export const SUPERTONIC_LANGUAGE_OPTIONS = [
  {label: '언어 중립', value: 'na'},
  {label: '한국어', value: 'ko'},
  {label: '영어', value: 'en'},
  {label: '일본어', value: 'ja'},
  {label: '아랍어', value: 'ar'},
  {label: '불가리아어', value: 'bg'},
  {label: '체코어', value: 'cs'},
  {label: '덴마크어', value: 'da'},
  {label: '독일어', value: 'de'},
  {label: '그리스어', value: 'el'},
  {label: '스페인어', value: 'es'},
  {label: '에스토니아어', value: 'et'},
  {label: '핀란드어', value: 'fi'},
  {label: '프랑스어', value: 'fr'},
  {label: '힌디어', value: 'hi'},
  {label: '크로아티아어', value: 'hr'},
  {label: '헝가리어', value: 'hu'},
  {label: '인도네시아어', value: 'id'},
  {label: '이탈리아어', value: 'it'},
  {label: '리투아니아어', value: 'lt'},
  {label: '라트비아어', value: 'lv'},
  {label: '네덜란드어', value: 'nl'},
  {label: '폴란드어', value: 'pl'},
  {label: '포르투갈어', value: 'pt'},
  {label: '루마니아어', value: 'ro'},
  {label: '러시아어', value: 'ru'},
  {label: '슬로바키아어', value: 'sk'},
  {label: '슬로베니아어', value: 'sl'},
  {label: '스웨덴어', value: 'sv'},
  {label: '터키어', value: 'tr'},
  {label: '우크라이나어', value: 'uk'},
  {label: '베트남어', value: 'vi'},
] as const satisfies ReadonlyArray<SupertonicLanguageOption>

const isSupertonicLanguage = (language: string): language is SupertonicLanguage =>
  SUPERTONIC_LANGUAGES.some((supportedLanguage) => supportedLanguage === language)

/** Resolves an HTML language tag to a language token supported by Supertonic 3. */
export const resolveSupertonicLanguage = (htmlLanguage: string): SupertonicLanguage => {
  const [primaryLanguage = ''] = htmlLanguage.trim().toLowerCase().split(/[-_]/u)
  return isSupertonicLanguage(primaryLanguage) ? primaryLanguage : 'na'
}
