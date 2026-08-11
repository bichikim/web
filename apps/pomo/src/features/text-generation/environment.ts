export const supportsWebGpu = () => typeof navigator !== 'undefined' && 'gpu' in navigator
