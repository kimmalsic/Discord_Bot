import { Milestone, Prisma } from '@prisma/client'
import { prisma } from '../database'
import { CreateMilestoneDto, UpdateMilestoneDto } from '../types/dto'
import { MilestoneStatus } from '../types/enums'

// 마일스톤 조회 필터
export interface MilestoneFilters {
  projectId?: string
  guildId?: string
  status?: MilestoneStatus
  assigneeDiscordId?: string
  delayed?: boolean
}

// 마일스톤 with 프로젝트
export type MilestoneWithProject = Prisma.MilestoneGetPayload<{
  include: { project: true }
}>

// 마일스톤 Repository
export const milestoneRepository = {
  // 마일스톤 생성
  async create(data: CreateMilestoneDto): Promise<Milestone> {
    return prisma.milestone.create({
      data,
    })
  },

  // ID로 마일스톤 조회
  async findById(id: string): Promise<Milestone | null> {
    return prisma.milestone.findUnique({
      where: { id },
    })
  },

  // ID로 마일스톤 조회 (프로젝트 포함)
  async findByIdWithProject(id: string): Promise<MilestoneWithProject | null> {
    return prisma.milestone.findUnique({
      where: { id },
      include: { project: true },
    })
  },

  // 프로젝트별 마일스톤 조회
  async findByProjectId(projectId: string): Promise<Milestone[]> {
    return prisma.milestone.findMany({
      where: { projectId },
      orderBy: { targetDate: 'asc' },
    })
  },

  // 필터로 마일스톤 목록 조회
  async findMany(filters: MilestoneFilters): Promise<MilestoneWithProject[]> {
    const where: Prisma.MilestoneWhereInput = {}

    if (filters.projectId) {
      where.projectId = filters.projectId
    }

    if (filters.guildId) {
      where.project = {
        guildId: filters.guildId,
      }
    }

    if (filters.status) {
      where.status = filters.status
    }

    if (filters.assigneeDiscordId) {
      where.assigneeDiscordId = filters.assigneeDiscordId
    }

    if (filters.delayed !== undefined) {
      if (filters.delayed) {
        where.status = MilestoneStatus.DELAYED
      } else {
        where.status = { not: MilestoneStatus.DELAYED }
      }
    }

    return prisma.milestone.findMany({
      where,
      include: { project: true },
      orderBy: { targetDate: 'asc' },
    })
  },

  // 마일스톤 업데이트
  async update(id: string, data: UpdateMilestoneDto): Promise<Milestone> {
    return prisma.milestone.update({
      where: { id },
      data,
    })
  },

  // 마일스톤 완료 처리
  async complete(id: string): Promise<Milestone> {
    return prisma.milestone.update({
      where: { id },
      data: {
        status: MilestoneStatus.COMPLETED,
        completedAt: new Date(),
      },
    })
  },

  // 마일스톤 삭제
  async delete(id: string): Promise<void> {
    await prisma.milestone.delete({
      where: { id },
    })
  },

  // D-N 알림 대상 마일스톤 조회 (특정 날짜에 목표일인 마일스톤)
  async findForNotification(targetDate: Date, notifiedField: 'notifiedD7' | 'notifiedD1'): Promise<MilestoneWithProject[]> {
    const startOfDay = new Date(targetDate)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(targetDate)
    endOfDay.setHours(23, 59, 59, 999)

    return prisma.milestone.findMany({
      where: {
        targetDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: MilestoneStatus.SCHEDULED,
        [notifiedField]: false,
      },
      include: { project: true },
    })
  },

  // 알림 발송 완료 마킹
  async markNotified(id: string, field: 'notifiedD7' | 'notifiedD1' | 'notifiedDelayed'): Promise<void> {
    await prisma.milestone.update({
      where: { id },
      data: { [field]: true },
    })
  },

  // 지연된 마일스톤 조회
  async findDelayed(): Promise<MilestoneWithProject[]> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return prisma.milestone.findMany({
      where: {
        targetDate: {
          lt: today,
        },
        status: {
          not: MilestoneStatus.COMPLETED,
        },
      },
      include: { project: true },
    })
  },

  // 지연된 마일스톤 상태 업데이트
  async updateDelayedStatus(): Promise<number> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const result = await prisma.milestone.updateMany({
      where: {
        targetDate: {
          lt: today,
        },
        status: MilestoneStatus.SCHEDULED,
      },
      data: {
        status: MilestoneStatus.DELAYED,
      },
    })

    return result.count
  },

  // 프로젝트별 마일스톤 통계
  async getStatsByProject(projectId: string): Promise<{
    total: number
    completed: number
    delayed: number
    scheduled: number
  }> {
    const milestones = await prisma.milestone.groupBy({
      by: ['status'],
      where: { projectId },
      _count: { status: true },
    })

    const stats = {
      total: 0,
      completed: 0,
      delayed: 0,
      scheduled: 0,
    }

    for (const m of milestones) {
      const count = m._count.status
      stats.total += count

      switch (m.status) {
        case MilestoneStatus.COMPLETED:
          stats.completed = count
          break
        case MilestoneStatus.DELAYED:
          stats.delayed = count
          break
        case MilestoneStatus.SCHEDULED:
          stats.scheduled = count
          break
      }
    }

    return stats
  },
}
