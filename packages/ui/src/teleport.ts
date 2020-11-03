import {Plugin, inject} from 'vue'
import {isBrowser} from '@/utils'

export const teleportSym = Symbol('teleport')

export interface TeleportContext {
  dom?: HTMLElement
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TeleportOptions {
  // empty
}

export const createTeleportContext = (dom): TeleportContext => {
  return {
    dom,
  }
}

export const useTeleport = (): TeleportContext => {
  return inject(teleportSym, {})
}

export const createTeleport = (): Required<Plugin> => {
  return {
    install(app) {
      let dom
      if (isBrowser()) {
        dom = window.document.createElement('div')
        dom.style.position = 'fixed'
        dom.style.top = '0'
        dom.style.left = '0'
        window.document.body.appendChild(dom)
      }
      app.provide(teleportSym, createTeleportContext(dom))
    },
  }
}
