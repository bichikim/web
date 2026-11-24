import type {MicrophoneDevice} from './types'

/** Lists input IDs in the same webview that owns capture, where microphone permission applies. */
export const readMicrophones = async (): Promise<readonly MicrophoneDevice[]> => {
  const media = globalThis.navigator?.mediaDevices
  if (media?.enumerateDevices === undefined) {
    return []
  }
  const devices = await media.enumerateDevices()
  return devices
    .filter(
      (device) =>
        device.kind === 'audioinput' && device.deviceId !== '' && device.deviceId !== 'default',
    )
    .map((device) => ({id: device.deviceId, label: device.label}))
}
