const MAX_LANGUAGE_LENGTH = 35
/** Canonicalizes a language tag; invalid user input has no language value. */
export const semanticLanguage = (value: string): string | undefined => {
  const trimmed = value.trim()
  if (trimmed.length < 2 || trimmed.length > MAX_LANGUAGE_LENGTH) {
    return undefined
  }
  try {
    return Intl.getCanonicalLocales(trimmed)[0]
  } catch {
    return undefined
  }
}
