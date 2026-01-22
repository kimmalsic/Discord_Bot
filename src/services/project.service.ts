import { Project } from '@prisma/client'
import {
  projectRepository,
  ProjectFilters,
  ProjectWithRelations,
  milestoneRepository,
  issueRepository,
} from '../repositories'
import { CreateProjectDto, UpdateProjectDto } from '../types/dto'
import { ProjectStatus, IssueStatus, MilestoneStatus } from '../types/enums'
import { calculateProgress } from '../utils/date'

// 프로젝트 상세 정보 with 통계
export interface ProjectDetail extends ProjectWithRelations {
  stats: {
    milestones: {
      total: number
      completed: number
      delayed: number
    }
    issues: {
      total: number
      open: number
      critical: number
    }
    progress: number
  }
}

// 프로젝트 서비스
export const projectService = {
  // 프로젝트 생성
  async create(data: CreateProjectDto): Promise<Project> {
    // 날짜 검증
    if (data.endDate <= data.startDate) {
      throw new Error('종료일은 시작일 이후여야 합니다.')
    }

    return projectRepository.create(data)
  },

  // 프로젝트 조회
  async findById(id: string): Promise<Project | null> {
    return projectRepository.findById(id)
  },

  // 프로젝트 상세 조회 (통계 포함)
  async getDetail(id: string): Promise<ProjectDetail | null> {
    const project = await projectRepository.findByIdWithRelations(id)
    if (!project) return null

    // 통계 계산
    const completedMilestones = project.milestones.filter(
      m => m.status === MilestoneStatus.COMPLETED
    ).length
    const delayedMilestones = project.milestones.filter(
      m => m.status === MilestoneStatus.DELAYED
    ).length

    const openIssues = project.issues.filter(
      i => i.status === IssueStatus.OPEN || i.status === IssueStatus.IN_ACTION
    ).length
    const criticalIssues = project.issues.filter(
      i => i.impact === 'CRITICAL' && (i.status === IssueStatus.OPEN || i.status === IssueStatus.IN_ACTION)
    ).length

    const progress = calculateProgress(project.startDate, project.endDate)

    return {
      ...project,
      stats: {
        milestones: {
          total: project.milestones.length,
          completed: completedMilestones,
          delayed: delayedMilestones,
        },
        issues: {
          total: project.issues.length,
          open: openIssues,
          critical: criticalIssues,
        },
        progress,
      },
    }
  },

  // 프로젝트 목록 조회
  async findMany(filters: ProjectFilters): Promise<Project[]> {
    return projectRepository.findMany(filters)
  },

  // 프로젝트 상태 변경
  async updateStatus(id: string, status: ProjectStatus): Promise<Project> {
    const project = await projectRepository.findById(id)
    if (!project) {
      throw new Error('프로젝트를 찾을 수 없습니다.')
    }

    // 이미 완료된 프로젝트는 변경 불가 (재활성화 제외)
    if (project.status === ProjectStatus.COMPLETED && status !== ProjectStatus.IN_PROGRESS) {
      throw new Error('완료된 프로젝트의 상태는 변경할 수 없습니다.')
    }

    return projectRepository.update(id, { status })
  },

  // 프로젝트 업데이트
  async update(id: string, data: UpdateProjectDto): Promise<Project> {
    const project = await projectRepository.findById(id)
    if (!project) {
      throw new Error('프로젝트를 찾을 수 없습니다.')
    }

    // 날짜 검증
    const startDate = data.startDate ?? project.startDate
    const endDate = data.endDate ?? project.endDate
    if (endDate <= startDate) {
      throw new Error('종료일은 시작일 이후여야 합니다.')
    }

    return projectRepository.update(id, data)
  },

  // 프로젝트 종료
  async complete(id: string): Promise<Project> {
    const project = await projectRepository.findById(id)
    if (!project) {
      throw new Error('프로젝트를 찾을 수 없습니다.')
    }

    if (project.status === ProjectStatus.COMPLETED) {
      throw new Error('이미 완료된 프로젝트입니다.')
    }

    // 미해결 이슈 확인
    const openIssues = await issueRepository.findMany({
      projectId: id,
      openOnly: true,
    })

    if (openIssues.length > 0) {
      throw new Error(`${openIssues.length}개의 미해결 이슈가 있습니다. 이슈를 먼저 처리해주세요.`)
    }

    return projectRepository.update(id, { status: ProjectStatus.COMPLETED })
  },

  // 프로젝트 삭제
  async delete(id: string): Promise<void> {
    const project = await projectRepository.findById(id)
    if (!project) {
      throw new Error('프로젝트를 찾을 수 없습니다.')
    }

    return projectRepository.delete(id)
  },

  // 참여자 추가
  async addParticipant(projectId: string, discordId: string): Promise<void> {
    const project = await projectRepository.findById(projectId)
    if (!project) {
      throw new Error('프로젝트를 찾을 수 없습니다.')
    }

    return projectRepository.addParticipant(projectId, discordId)
  },

  // 참여자 제거
  async removeParticipant(projectId: string, discordId: string): Promise<void> {
    const project = await projectRepository.findById(projectId)
    if (!project) {
      throw new Error('프로젝트를 찾을 수 없습니다.')
    }

    // PM은 제거 불가
    if (project.pmDiscordId === discordId) {
      throw new Error('PM은 참여자에서 제거할 수 없습니다.')
    }

    return projectRepository.removeParticipant(projectId, discordId)
  },

  // 서버 통계 조회
  async getGuildStats(guildId: string): Promise<{
    total: number
    active: number
    byStatus: Record<string, number>
  }> {
    const stats = await projectRepository.getStatsByGuild(guildId)
    const total = Object.values(stats).reduce((sum, count) => sum + count, 0)
    const active = total - (stats[ProjectStatus.COMPLETED] ?? 0)

    return {
      total,
      active,
      byStatus: stats,
    }
  },
}
