export const useBlur = () => {
  return () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  }
}
