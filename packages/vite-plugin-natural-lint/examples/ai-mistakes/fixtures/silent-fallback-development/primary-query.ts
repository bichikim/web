declare const queryCurrentPlan: () => Promise<string>

export const loadCurrentPlan = async (): Promise<string | null> => {
  try {
    return await queryCurrentPlan()
  } catch {
    return null
  }
}
