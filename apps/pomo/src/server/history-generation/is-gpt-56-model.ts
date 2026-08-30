export const isGpt56Model = (model: string): boolean =>
  model === 'gpt-5.6' || model.startsWith('gpt-5.6-')
