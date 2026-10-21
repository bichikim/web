/** Returns milliseconds on the current realm's event timeline, independent of wall-clock changes. */
export const getMonotonicTime = (): number => new Event('clock').timeStamp
