const target: any = typeof window !== 'undefined'
  ? window
  : typeof global !== 'undefined'
    ? global
    : {}
const devtoolHook = target.__VUE_DEVTOOLS_GLOBAL_HOOK__

// export default function devtoolPlugin (store) {
//   if (!devtoolHook) return
//
//   store._devtoolHook = devtoolHook
//
//   devtoolHook.emit('vuex:init', store)
//
//   devtoolHook.on('vuex:travel-to-state', targetState => {
//     store.replaceState(targetState)
//   })
//
//   store.subscribe((mutation, state) => {
//     devtoolHook.emit('vuex:mutation', mutation, state)
//   }, { prepend: true })
//
//   store.subscribeAction((action, state) => {
//     devtoolHook.emit('vuex:action', action, state)
//   }, { prepend: true })
// }

export function _triggerDevToolAction(storeName: string, name: string, args: any[], state: any): void {
  if (process.env.NODE_ENV === 'development') {
    devtoolHook.emit(
      'vuex:action',
      {
        type: `${storeName}:${name}`,
      },
      state,
    )
  }
}

export function _triggerDevToolMutation(storeName: string, name: string, args: any[], state: any): void {
  if (process.env.NODE_ENV === 'development') {
    devtoolHook.emit(
      'vuex:mutation',
      {
        type: `${storeName}:${name}`,
      },
      state,
    )
  }
}
