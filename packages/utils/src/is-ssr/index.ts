// no need to cover all
/* istanbul ignore next */
/**
 * @deprecated
 */
export const isSSR = () => typeof globalThis.window?.document?.createElement === 'undefined'
