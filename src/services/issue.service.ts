import { Issue } from '@prisma/client'
import {
  issueRepository,
  IssueFilters,
  IssueWithProject,
  projectRepository,
} from '../repositories'
import { CreateIssueDto, UpdateIssueDto } from '../types/dto'
import { IssueStatus, IssueImpact, ProjectStatus } from '../types/enums'

// 이슈 서비스
export const issueService = {
  // 이슈 생성
  async create(data: CreateIssueDto): Promise<Issue> {
    // 프로젝트 존재 확인
    const project = await projectRepository.findById(data.projectId)
    if (!project) {
      throw new Error('프로젝트를 찾을 수 없습니다.')
    }

    // 완료된 프로젝트에는 추가 불가
    if (project.status === ProjectStatus.COMPLETED) {
      throw new Error('완료된 프로젝트에는 이슈를 등록할 수 없습니다.')
    }

    const issue = await issueRepository.create(data)

    // Critical 이슈 등록 시 프로젝트 상태를 ISSUE로 변경
    if (data.impact === IssueImpact.CRITICAL && project.status === ProjectStatus.IN_PROGRESS) {
      await projectRepository.update(data.projectId, { status: ProjectStatus.ISSUE })
    }

    return issue
  },

  // 이슈 조회
  async findById(id: string): Promise<Issue | null> {
    return issueRepository.findById(id)
  },

  // 이슈 상세 조회 (프로젝트 포함)
  async findByIdWithProject(id: string): Promise<IssueWithProject | null> {
    return issueRepository.findByIdWithProject(id)
  },

  // 프로젝트별 이슈 조회
  async findByProject(projectId: string): Promise<Issue[]> {
    return issueRepository.findByProjectId(projectId)
  },

  // 필터로 이슈 목록 조회
  async findMany(filters: IssueFilters): Promise<IssueWithProject[]> {
    return issueRepository.findMany(filters)
  },

  // 이슈 업데이트
  async update(id: string, data: UpdateIssueDto): Promise<Issue> {
    const issue = await issueRepository.findByIdWithProject(id)
    if (!issue) {
      throw new Error('이슈를 찾을 수 없습니다.')
    }

    // 종료된 이슈는 수정 불가
    if (issue.status === IssueStatus.CLOSED) {
      throw new Error('종료된 이슈는 수정할 수 없습니다.')
    }

    return issueRepository.update(id, data)
  },

  // 이슈 조치 (상태 변경)
  async updateStatus(id: string, status: IssueStatus): Promise<Issue> {
    const issue = await issueRepository.findByIdWithProject(id)
    if (!issue) {
      throw new Error('이슈를 찾을 수 없습니다.')
    }

    // 종료된 이슈는 상태 변경 불가
    if (issue.status === IssueStatus.CLOSED) {
      throw new Error('종료된 이슈의 상태는 변경할 수 없습니다.')
    }

    return issueRepository.updateStatus(id, status)
  },

  // 이슈 종료 (조치 내용 기록)
  async close(id: string, resolution?: string): Promise<Issue> {
    const issue = await issueRepository.findByIdWithProject(id)
    if (!issue) {
      throw new Error('이슈를 찾을 수 없습니다.')
    }

    if (issue.status === IssueStatus.CLOSED) {
      throw new Error('이미 종료된 이슈입니다.')
    }

    const closedIssue = await issueRepository.updateStatus(id, IssueStatus.CLOSED, resolution)

    // Critical 이슈가 모두 종료되면 프로젝트 상태를 IN_PROGRESS로 복구
    if (issue.impact === IssueImpact.CRITICAL) {
      const remainingCritical = await issueRepository.findCritical()
      const projectCritical = remainingCritical.filter(
        i => i.projectId === issue.projectId && i.id !== id
      )

      if (projectCritical.length === 0) {
        const project = await projectRepository.findById(issue.projectId)
        if (project && project.status === ProjectStatus.ISSUE) {
          await projectRepository.update(issue.projectId, { status: ProjectStatus.IN_PROGRESS })
        }
      }
    }

    return closedIssue
  },

  // 이슈 삭제
  async delete(id: string): Promise<void> {
    const issue = await issueRepository.findById(id)
    if (!issue) {
      throw new Error('이슈를 찾을 수 없습니다.')
    }

    return issueRepository.delete(id)
  },

  // 미조치 이슈 조회 (3일 이상)
  async findUnattended(days: number = 3): Promise<IssueWithProject[]> {
    return issueRepository.findUnattended(days)
  },

  // 경고 대상 이슈 조회 (마지막 경고 후 6시간 이상)
  async findForWarning(hoursThreshold: number = 6, daysUnattended: number = 3): Promise<IssueWithProject[]> {
    return issueRepository.findForWarning(hoursThreshold, daysUnattended)
  },

  // 경고 발송 시간 업데이트
  async markWarning(id: string): Promise<void> {
    return issueRepository.updateWarningTime(id)
  },

  // Critical 이슈 조회
  async findCritical(guildId?: string): Promise<IssueWithProject[]> {
    return issueRepository.findCritical(guildId)
  },

  // 프로젝트별 이슈 통계
  async getStatsByProject(projectId: string): Promise<{
    total: number
    open: number
    inAction: number
    resolved: number
    closed: number
    byImpact: Record<string, number>
    resolutionRate: number
  }> {
    const stats = await issueRepository.getStatsByProject(projectId)
    const resolutionRate = stats.total > 0
      ? Math.round(((stats.resolved + stats.closed) / stats.total) * 100)
      : 0

    return {
      ...stats,
      resolutionRate,
    }
  },

  // 새 Critical 이슈인지 확인 (알림용)
  isCritical(impact: string): boolean {
    return impact === IssueImpact.CRITICAL
  },
}
