// 사업 상태
export const ProjectStatus = {
  PLANNING: 'PLANNING',         // 기획중
  IN_PROGRESS: 'IN_PROGRESS',   // 진행중
  ISSUE: 'ISSUE',               // 이슈발생
  ON_HOLD: 'ON_HOLD',           // 보류
  COMPLETED: 'COMPLETED',       // 완료
} as const

export type ProjectStatus = typeof ProjectStatus[keyof typeof ProjectStatus]

// 일정 상태
export const MilestoneStatus = {
  SCHEDULED: 'SCHEDULED',   // 예정
  COMPLETED: 'COMPLETED',   // 완료
  DELAYED: 'DELAYED',       // 지연
} as const

export type MilestoneStatus = typeof MilestoneStatus[keyof typeof MilestoneStatus]

// 이슈 영향도
export const IssueImpact = {
  LOW: 'LOW',           // 낮음
  MEDIUM: 'MEDIUM',     // 중간
  HIGH: 'HIGH',         // 높음
  CRITICAL: 'CRITICAL', // 심각
} as const

export type IssueImpact = typeof IssueImpact[keyof typeof IssueImpact]

// 이슈 상태
export const IssueStatus = {
  OPEN: 'OPEN',           // 등록
  IN_ACTION: 'IN_ACTION', // 조치중
  RESOLVED: 'RESOLVED',   // 해결
  CLOSED: 'CLOSED',       // 종료
} as const

export type IssueStatus = typeof IssueStatus[keyof typeof IssueStatus]

// 참여자 역할
export const ParticipantRole = {
  PM: 'PM',         // 프로젝트 매니저
  MEMBER: 'MEMBER', // 일반 참여자
} as const

export type ParticipantRole = typeof ParticipantRole[keyof typeof ParticipantRole]

// 문서 유형
export const DocumentType = {
  PLAN: '기획서',
  DESIGN: '설계서',
  MEETING: '회의록',
  REFERENCE: '참고자료',
  CONTRACT: '계약서',
  REPORT: '보고서',
  OTHER: '기타',
} as const

export type DocumentType = typeof DocumentType[keyof typeof DocumentType]

// 한글 라벨 매핑
export const ProjectStatusLabels: Record<ProjectStatus, string> = {
  PLANNING: '📋 기획중',
  IN_PROGRESS: '🚀 진행중',
  ISSUE: '⚠️ 이슈발생',
  ON_HOLD: '⏸️ 보류',
  COMPLETED: '✅ 완료',
}

export const MilestoneStatusLabels: Record<MilestoneStatus, string> = {
  SCHEDULED: '📅 예정',
  COMPLETED: '✅ 완료',
  DELAYED: '⚠️ 지연',
}

export const IssueImpactLabels: Record<IssueImpact, string> = {
  LOW: '🟢 낮음',
  MEDIUM: '🟡 중간',
  HIGH: '🟠 높음',
  CRITICAL: '🔴 심각',
}

export const IssueStatusLabels: Record<IssueStatus, string> = {
  OPEN: '📋 등록',
  IN_ACTION: '🔧 조치중',
  RESOLVED: '✅ 해결',
  CLOSED: '🔒 종료',
}
