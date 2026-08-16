/** Escapes a value for an XML text node. */
export const escapeXmlText = (value: string): string =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

/** Escapes a value for a double-quoted XML attribute. */
export const escapeXmlAttribute = (value: string): string =>
  escapeXmlText(value).replaceAll('"', '&quot;').replaceAll("'", '&apos;')
