/** Server AI jobs remain unreleased until deployment and entitlement verification are approved. */
// 출시 보류 결정: 구현 누락이나 불필요한 코드가 아니다. UI/API/cron/runner를 함께 닫는다.
// 배포·권한·비용 검증과 사용자의 공개 지시 전에는 true로 변경하거나 우회하지 않는다.
// 기존 기기 내 Gemma 실행은 이 플래그의 대상이 아니다.
export const SERVER_AI_RELEASED: boolean = false
