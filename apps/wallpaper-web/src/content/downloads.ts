interface Download {
  readonly platform: string
  readonly label: string
  readonly href: string | null
}

export const DOWNLOADS: readonly Download[] = [
  {href: null, label: 'macOS용 다운로드', platform: 'macOS'},
  {href: null, label: 'Windows용 다운로드', platform: 'Windows'},
]
