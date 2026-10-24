/**
 * Vite automatically injects the imported CSS into <head> as a <style> tag.
 */
const createFontImport = () => {
  let fontLoadPromise: Promise<unknown> | null = null

  return () => {
    if (fontLoadPromise) {
      return fontLoadPromise
    }

    // do not use dynamic import because vite handle this as style tag injection
    fontLoadPromise = import('pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css')

    return fontLoadPromise
  }
}

export const fontImport = createFontImport()
