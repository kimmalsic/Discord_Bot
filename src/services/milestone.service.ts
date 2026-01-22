import { Milestone } from '@prisma/client'
import {
  milestoneRepository,
  MilestoneFilters,
  MilestoneWithProject,
  projectRepository,
} from '../repositories'
import { CreateMilestoneDto, UpdateMilestoneDto } from '../types/dto'
import { MilestoneStatus, ProjectStatus } from '../types/enums'
import { isDelayed, getDaysRemaining } from '../utils/date'

// 마일스톤 서비스
export const milestoneService = {
  // 마일스톤 생성
  async create(data: CreateMilestoneDto): Promise<Milestone> {
    // 프로젝트 존재 확인
    const project = await projectRepository.findById(data.projectId)
    if (!project) {
      throw new Error('프로젝트를 찾을 수 없습니다.')
    }

    // 완료된 프로젝트에는 추가 불가
    if (project.status === ProjectStatus.COMPLETED) {
      throw new Error('완료된 프로젝트에는 일정을 추가할 수 없습니다.')
    }

    // 목표일이 프로젝트 기간 내인지 확인
    if (data.targetDate < project.startDate || data.targetDate > project.endDate) {
      throw new Error('목표일은 프로젝트 기간 내여야 합니다.')
    }

    return milestoneRepository.create(data)
  },

  // 마일스톤 조회
  async findById(id: string): Promise<Milestone | null> {
    return milestoneRepository.findById(id)
  },

  // 마일스톤 상세 조회 (프로젝트 포함)
  async findByIdWithProject(id: string): Promise<MilestoneWithProject | null> {
    return milestoneRepository.findByIdWithProject(id)
  },

  // 프로젝트별 마일스톤 조회
  async findByProject(projectId: string): Promise<Milestone[]> {
    return milestoneRepository.findByProjectId(projectId)
  },

  // 필터로 마일스톤 목록 조회
  async findMany(filters: MilestoneFilters): Promise<MilestoneWithProject[]> {
    return milestoneRepository.findMany(filters)
  },

  // 마일스톤 업데이트
  async update(id: string, data: UpdateMilestoneDto): Promise<Milestone> {
    const milestone = await milestoneRepository.findByIdWithProject(id)
    if (!milestone) {
      throw new Error('일정을 찾을 수 없습니다.')
    }

    // 완료된 프로젝트는 수정 불가
    if (milestone.project.status === ProjectStatus.COMPLETED) {
      throw new Error('완료된 프로젝트의 일정은 수정할 수 없습니다.')
    }

    // 목표일 변경 시 기간 확인
    if (data.targetDate) {
      const project = milestone.project
      if (data.targetDate < project.startDate || data.targetDate > project.endDate) {
        throw new Error('목표일은 프로젝트 기간 내여야 합니다.')
      }
    }

    return milestoneRepository.update(id, data)
  },

  // 마일스톤 완료 처리
  async complete(id: string): Promise<Milestone> {
    const milestone = await milestoneRepository.findByIdWithProject(id)
    if (!milestone) {
      throw new Error('일정을 찾을 수 없습니다.')
    }

    if (milestone.status === MilestoneStatus.COMPLETED) {
      throw new Error('이미 완료된 일정입니다.')
    }

    return milestoneRepository.complete(id)
  },

  // 마일스톤 삭제
  async delete(id: string): Promise<void> {
    const milestone = await milestoneRepository.findById(id)
    if (!milestone) {
      throw new Error('일정을 찾을 수 없습니다.')
    }

    return milestoneRepository.delete(id)
  },

  // D-7 알림 대상 조회
  async findForD7Notification(): Promise<MilestoneWithProject[]> {
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + 7)
    return milestoneRepository.findForNotification(targetDate, 'notifiedD7')
  },

  // D-1 알림 대상 조회
  async findForD1Notification(): Promise<MilestoneWithProject[]> {
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + 1)
    return milestoneRepository.findForNotification(targetDate, 'notifiedD1')
  },

  // 알림 발송 완료 마킹
  async markNotified(id: string, type: 'D7' | 'D1' | 'DELAYED'): Promise<void> {
    const field = type === 'D7' ? 'notifiedD7' : type === 'D1' ? 'notifiedD1' : 'notifiedDelayed'
    return milestoneRepository.markNotified(id, field)
  },

  // 지연된 마일스톤 조회
  async findDelayed(): Promise<MilestoneWithProject[]> {
    return milestoneRepository.findDelayed()
  },

  // 지연된 마일스톤 상태 자동 업데이트
  async updateDelayedStatus(): Promise<number> {
    return milestoneRepository.updateDelayedStatus()
  },

  // 프로젝트별 마일스톤 통계
  async getStatsByProject(projectId: string): Promise<{
    total: number
    completed: number
    delayed: number
    scheduled: number
    completionRate: number
  }> {
    const stats = await milestoneRepository.getStatsByProject(projectId)
    const completionRate = stats.total > 0
      ? Math.round((stats.completed / stats.total) * 100)
      : 0

    return {
      ...stats,
      completionRate,
    }
  },

  // 다음 마감 일정 조회
  async findUpcoming(guildId: string, limit: number = 5): Promise<MilestoneWithProject[]> {
    const milestones = await milestoneRepository.findMany({
      guildId,
      status: MilestoneStatus.SCHEDULED,
    })

    // 오늘 이후 마감인 것만 필터링하고 정렬
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return milestones
      .filter(m => m.targetDate >= today)
      .sort((a, b) => a.targetDate.getTime() - b.targetDate.getTime())
      .slice(0, limit)
  },
}
