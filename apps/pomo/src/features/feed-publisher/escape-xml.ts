const XML_10_DISALLOWED_CHARACTERS = /[^\t\n\r\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu

/** Escapes a value for an XML text node. */
export const escapeXmlText = (value: string): string =>
  value
    .replace(XML_10_DISALLOWED_CHARACTERS, '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')

/** Escapes a value for a double-quoted XML attribute. */
export const escapeXmlAttribute = (value: string): string =>
  escapeXmlText(value).replaceAll('"', '&quot;').replaceAll("'", '&apos;')
