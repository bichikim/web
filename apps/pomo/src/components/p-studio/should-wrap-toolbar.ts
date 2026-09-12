interface ShouldWrapToolbarOptions {
  readonly availableWidth: number
  readonly controlWidths: readonly number[]
  readonly gap: number
}

export const shouldWrapToolbar = (options: ShouldWrapToolbarOptions): boolean => {
  const widths = options.controlWidths.filter((width) => width > 0)
  const needed =
    widths.reduce((total, width) => total + width, 0) + Math.max(0, widths.length - 1) * options.gap
  return needed > options.availableWidth
}
