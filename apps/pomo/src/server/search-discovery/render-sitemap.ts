export interface RenderSitemapOptions {
  /** 경로 해석과 동일 출처 확인의 기준이 되는 URL. */
  readonly origin: string
  /** 입력 순서와 중복을 유지해 정규 URL로 변환할 경로 목록. */
  readonly indexablePaths: ReadonlyArray<string>
}

const escapeXml = (value: string): string =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

const getCanonicalUrls = (options: RenderSitemapOptions): ReadonlyArray<string> => {
  const originUrl = new URL(options.origin)

  return options.indexablePaths.map((pathname) => {
    const canonicalUrl = new URL(pathname, originUrl)

    if (canonicalUrl.origin !== originUrl.origin) {
      throw new Error(`Search path must stay on the configured origin: ${pathname}`)
    }

    return canonicalUrl.href
  })
}

const renderUrl = (url: string): string => `  <url>\n    <loc>${escapeXml(url)}</loc>\n  </url>`

/** 설정된 출처와 경로를 정규 URL로 변환해 XML 사이트맵을 만든다. */
export const renderSitemap = (
  options: RenderSitemapOptions,
): string => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${getCanonicalUrls(options).map(renderUrl).join('\n')}
</urlset>
`
