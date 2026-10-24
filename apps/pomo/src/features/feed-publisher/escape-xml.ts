const XML_10_TAB_CODE_POINT = 0x9
const XML_10_LINE_FEED_CODE_POINT = 0xa
const XML_10_CARRIAGE_RETURN_CODE_POINT = 0xd
const XML_10_ALLOWED_BMP_RANGE_START = 0x20
const XML_10_PRE_SURROGATE_RANGE_END = 0xd7ff
const XML_10_POST_SURROGATE_RANGE_START = 0xe000
const XML_10_BMP_RANGE_END = 0xfffd
const XML_10_SUPPLEMENTARY_RANGE_START = 0x10000
const XML_10_MAXIMUM_CHARACTER = 0x10ffff

const isXml10AllowedCharacter = (character: string): boolean => {
  const codePoint = character.codePointAt(0)

  return (
    codePoint === XML_10_TAB_CODE_POINT ||
    codePoint === XML_10_LINE_FEED_CODE_POINT ||
    codePoint === XML_10_CARRIAGE_RETURN_CODE_POINT ||
    (codePoint !== undefined &&
      ((codePoint >= XML_10_ALLOWED_BMP_RANGE_START &&
        codePoint <= XML_10_PRE_SURROGATE_RANGE_END) ||
        (codePoint >= XML_10_POST_SURROGATE_RANGE_START && codePoint <= XML_10_BMP_RANGE_END) ||
        (codePoint >= XML_10_SUPPLEMENTARY_RANGE_START && codePoint <= XML_10_MAXIMUM_CHARACTER)))
  )
}

/** Escapes a value for an XML text node. */
export const escapeXmlText = (value: string): string =>
  value
    .replace(/./gsu, (character) => (isXml10AllowedCharacter(character) ? character : ''))
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')

/** Escapes a value for a double-quoted XML attribute. */
export const escapeXmlAttribute = (value: string): string =>
  escapeXmlText(value).replaceAll('"', '&quot;').replaceAll("'", '&apos;')
