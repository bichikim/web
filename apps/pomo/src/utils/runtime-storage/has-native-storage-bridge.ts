/** ReactNativeWebView 속성이 전역 객체에 존재하는지 확인합니다. */
export const hasNativeStorageBridge = () => {
  // 일반 웹에서 네이티브 저장소 호출을 피하기 위한 분기 기준으로 사용합니다.
  // 토스 앱 여부나 Storage 사용 가능 여부를 보장하지 않으므로 SDK 호출 실패는 별도로 처리해야 합니다.
  return 'ReactNativeWebView' in globalThis
}
