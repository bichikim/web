declare const sendTelemetry: () => Promise<void>

/** Best-effort telemetry intentionally does not affect the caller's operation. */
export const sendOptionalTelemetry = async (): Promise<void> => {
  try {
    await sendTelemetry()
  } catch {
    return undefined
  }
}
