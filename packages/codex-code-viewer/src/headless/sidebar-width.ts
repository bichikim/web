interface SidebarWidthInput {
  readonly available: number
  readonly minimum: number
  readonly contentMinimum: number
  readonly spacing: number
  readonly initial: number
  readonly preferred: number
}
/** Constrains a sidebar in caller-defined units while retaining space for its content panel. */
export const sidebarWidth = (input: SidebarWidthInput) => {
  const maximum = Math.max(
    input.minimum,
    input.available > 0 ? input.available - input.contentMinimum - input.spacing : input.initial,
  )
  return {maximum, width: Math.round(Math.min(maximum, Math.max(input.minimum, input.preferred)))}
}
