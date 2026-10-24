/** 현재 realm의 Error는 그대로 반환하고, 다른 값은 대체 메시지와 원래 cause를 가진 Error로 감싼다. */
export const toError = (cause: unknown, fallback: string): Error =>
  cause instanceof Error ? cause : new Error(fallback, {cause})
