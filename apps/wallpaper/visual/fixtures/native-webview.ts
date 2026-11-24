import {getCurrentWebview} from '@tauri-apps/api/webview'
import {vi} from 'vitest'

export const mockNativeWebview = () => {
  const webview = {
    listen: vi.fn().mockResolvedValue(vi.fn()),
    setFocus: vi.fn().mockResolvedValue(undefined),
  }
  vi.mocked(getCurrentWebview).mockReturnValue(webview as ReturnType<typeof getCurrentWebview>)
  return webview
}
