declare const publish: (value: string) => Promise<void>

export const publishValue = async (value: string): Promise<boolean> => {
  try {
    await publish(value)
    return true
  } catch {
    return false
  }
}
