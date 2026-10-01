import {getRuntimePublicOrigin} from 'src/features/http-client'
import {createTransferSession} from './create-session'
import {createReceivedFiles} from './received-files'

export const receivedFiles = createReceivedFiles()
export const fileTransfer = createTransferSession({
  createConnection: () =>
    new RTCPeerConnection({iceServers: [{urls: 'stun:stun.cloudflare.com:3478'}]}),
  createId: () => crypto.randomUUID(),
  createSocket: (url) => new WebSocket(url),
  getOrigin: () =>
    import.meta.env.VITE_POMO_IS_APPS_IN_TOSS === 'true' ? undefined : getRuntimePublicOrigin(),
  receivedFiles,
})
