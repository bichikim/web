// Select values that cannot collide with user-entered names.
export const NONE = '\u0000none'

export const CREATE = '\u0000create'

export const optionLabel = (createLabel: string) => (value: string) => {
  switch (value) {
    case NONE:
      return '없음'
    case CREATE:
      return createLabel
    default:
      return value
  }
}
