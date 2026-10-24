interface PointerCaptureTarget {
  readonly hasPointerCapture?: (pointerId: number) => boolean
  readonly releasePointerCapture?: (pointerId: number) => void
}

/** 대상이 포인터 캡처를 유지하고 있을 때만 해제한다. */
export const releaseCapturedPointer = (target: PointerCaptureTarget, pointerId: number): void => {
  if (target.hasPointerCapture?.(pointerId)) {
    target.releasePointerCapture?.(pointerId)
  }
}
