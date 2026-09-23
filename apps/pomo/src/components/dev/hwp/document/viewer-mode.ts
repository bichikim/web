export const ViewerModes = ['direct', 'iframe'] as const

export type ViewerMode = (typeof ViewerModes)[number]
