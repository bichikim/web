/**
 * XML의 다섯 구분 문자를 엔티티로 치환하며 다른 문자는 그대로 둔다.
 * @param {string} value
 * @returns {string}
 */
export const escapeXmlValue = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
