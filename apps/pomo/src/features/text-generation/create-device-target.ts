import type {DeviceTextGenerationTarget} from './execution'
import type {TextModelId} from './model'

export const createDeviceTarget = (modelId: TextModelId): DeviceTextGenerationTarget => ({
  kind: 'device',
  modelId,
})
