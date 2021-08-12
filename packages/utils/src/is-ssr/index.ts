// no need to cover all
/* istanbul ignore next */
export const isSSR = () => typeof globalThis.window?.document?.createElement === 'undefined'
