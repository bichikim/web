interface ResolveAudioSourceOptions {
  readonly documentLocale: string
  readonly runtimeLocale: string
  readonly source: string
}

const isTourAudioLocale = (locale: string): locale is 'en' | 'ko' =>
  locale === 'en' || locale === 'ko'

export const resolveAudioSource = (options: ResolveAudioSourceOptions): string => {
  const {documentLocale, runtimeLocale, source} = options
  const sourceLocale =
    /^\/tour\/audio\/(?<locale>[^/]+)\//iu.exec(source)?.groups?.locale?.toLowerCase() ?? ''
  const locale = [runtimeLocale, documentLocale, sourceLocale].find(isTourAudioLocale) ?? 'ko'

  return source.replace(/^\/tour\/audio\/[^/]+\//iu, `/tour/audio/${locale}/`)
}
