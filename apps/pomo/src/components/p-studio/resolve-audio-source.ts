interface ResolveAudioSourceOptions {
  readonly documentLocale: string
  readonly runtimeLocale: string
  readonly source: string
}

export const resolveAudioSource = (options: ResolveAudioSourceOptions): string => {
  const {documentLocale, runtimeLocale, source} = options
  const locale = documentLocale === 'en' || documentLocale === 'ko' ? documentLocale : runtimeLocale

  return source.replace(/^\/tour\/audio\/(?:ko|en)\//u, `/tour/audio/${locale}/`)
}
