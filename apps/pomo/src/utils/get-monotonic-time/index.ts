/** 시스템 시각 변경과 무관한 현재 실행 영역의 이벤트 타임라인 시각을 밀리초로 반환한다. */
export const getMonotonicTime = (): number => new Event('clock').timeStamp
