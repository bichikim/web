# Pomo 디자인 시스템

## 글라스 컨트롤

| 상태          | 토큰                                     | 값          |
| ------------- | ---------------------------------------- | ----------- |
| 기본 표면     | `--focus-room-glass`                     | 검정 68%    |
| 호버 표면     | `--focus-room-glass-interactive`         | 검정 78%    |
| 블러          | `--focus-room-backdrop-blur`             | 8px         |
| 기본 테두리   | `--focus-room-border`                    | 밝은색 14%  |
| 호버 테두리   | `--focus-room-border-hover`              | 밝은색 28%  |
| 포커스        | `--focus-room-brass`                     | 브라스 색상 |
| 분할 오버레이 | `--focus-room-glass-interactive-overlay` | 검정 31.25% |

- 단일 버튼은 `focus-room-backdrop`과 `focus-room-interactive-glass`를 함께 사용한다.
- 여러 버튼을 하나의 캡슐에 담을 때는 부모에 `focus-room-backdrop`과
  `focus-room-interactive-glass-group`을, 각 버튼에 `focus-room-interactive-glass-part`를
  사용한다.
- 분할 캡슐은 hover나 focus가 들어온 버튼에만 분할 오버레이를 적용하고, 캡슐 전체의 테두리만
  상태에 맞게 바꾼다.
- 분할 버튼의 배경 경계는 컨트롤 반경으로 둥글게 처리한다.
- 특정 버튼이 캡슐 전체의 상세 화면을 대표한다면 해당 버튼에
  `focus-room-interactive-glass-group-trigger`를 추가한다. 이 버튼의 hover나 focus는 개별
  오버레이 대신 캡슐 전체의 표면을 바꾼다.
- 호버·포커스 배경을 컴포넌트에서 직접 지정하지 않는다. 상태 표시는 색상에만 의존하지 않고
  아이콘이나 레이블을 함께 사용한다.

## 상시 포커스 글라스

- 사용자의 주의를 계속 유지해야 하는 표면은 `focus-room-static-focus-glass`를 사용한다.
- 이 표면은 항상 호버 표면과 브라스 테두리를 표시하며, hover나 focus로 색이 더 바뀌지 않는다.
- 대화창에 이 규칙을 적용한다. 대화창 안의 독립된 버튼은 일반 포커스 표시를 유지한다.
