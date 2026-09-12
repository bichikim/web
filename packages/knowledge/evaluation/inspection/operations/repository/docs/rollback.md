---
knowledge:
  id: operations/rollback
  type: rule
---

# Pomo 배포 실패 복구 {#policy}

Pomo 배포가 실패하면 운영 도메인을 이전 Vercel deployment로 유지하거나 복구한다. 오디오 게이트웨이 배포 후 Pomo 배포가 실패하면 게이트웨이도 실행 전에 기록한 production version으로 되돌린다.
