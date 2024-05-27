import http from 'node:http'
import type {Ref} from 'vue'

export type Data = Record<string, any>
export type Headers = Record<string, string>
export interface ViteVueSsrOptions {
  /**
   * @default index.html
   */
  template?: string
}

export type SSRBufferItem = string | SSRBuffer | Promise<SSRBuffer>

export type SSRBuffer = SSRBufferItem[] & {
  hasAsync?: boolean
}

export interface SSRContext {
  [key: string]: any
  __teleportBuffers?: Record<string, SSRBuffer>
  req: http.IncomingMessage
  res: http.ServerResponse
  teleports?: Record<string, string>
  url: string
}

export type MaybeRef<T> = Ref<T> | T
