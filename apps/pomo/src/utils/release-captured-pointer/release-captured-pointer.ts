interface PointerCaptureTarget {
  readonly hasPointerCapture?: (pointerId: number) => boolean
  readonly releasePointerCapture?: (pointerId: number) => void
}

/** Releases a pointer only while its target still owns capture. */
export const releaseCapturedPointer = (target: PointerCaptureTarget, pointerId: number): void => {
  if (target.hasPointerCapture?.(pointerId)) {
    target.releasePointerCapture?.(pointerId)
  }
}
