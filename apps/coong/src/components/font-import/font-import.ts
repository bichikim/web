/**
 * Vite automatically injects the imported CSS into <head> as a <style> tag.
 */
const createFontImport = (href: string) => {
  let fontLoadPromise: Promise<unknown> | null = null

  return () => {
    if (fontLoadPromise) {
      return fontLoadPromise
    }

    fontLoadPromise = import(href)

    return fontLoadPromise
  }
}

export const fontImport = createFontImport('pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css')
