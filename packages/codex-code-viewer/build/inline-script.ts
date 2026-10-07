/** Escapes HTML script closing tags while preserving the JavaScript string value. */
export const inlineScript = (code: string): string =>
  code.replaceAll(/<\/script(?=[\t\n\f\r />])/giu, (tag) => tag.replace('<', '<\\'))
