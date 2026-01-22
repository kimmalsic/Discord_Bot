import { Issue, Prisma } from '@prisma/client'
import { prisma } from '../database'
import { CreateIssueDto, UpdateIssueDto } from '../types/dto'
import { IssueStatus, IssueImpact } from '../types/enums'

// 이슈 조회 필터
export interface IssueFilters {
  projectId?: string
  guildId?: string
  status?: IssueStatus
  impact?: IssueImpact
  assigneeDiscordId?: string
  openOnly?: boolean
}

// 이슈 with 프로젝트
export type IssueWithProject = Prisma.IssueGetPayload<{
  include: { project: true }
}>

// 이슈 Repository
export const issueRepository = {
  // 이슈 생성
  async create(data: CreateIssueDto): Promise<Issue> {
    return prisma.issue.create({
      data,
    })
  },

  // ID로 이슈 조회
  async findById(id: string): Promise<Issue | null> {
    return prisma.issue.findUnique({
      where: { id },
    })
  },

  // ID로 이슈 조회 (프로젝트 포함)
  async findByIdWithProject(id: string): Promise<IssueWithProject | null> {
    return prisma.issue.findUnique({
      where: { id },
      include: { project: true },
    })
  },

  // 프로젝트별 이슈 조회
  async findByProjectId(projectId: string): Promise<Issue[]> {
    return prisma.issue.findMany({
      where: { projectId },
      orderBy: [
        { impact: 'desc' }, // Critical이 먼저
        { createdAt: 'desc' },
      ],
    })
  },

  // 필터로 이슈 목록 조회
  async findMany(filters: IssueFilters): Promise<IssueWithProject[]> {
    const where: Prisma.IssueWhereInput = {}

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

    if (filters.impact) {
      where.impact = filters.impact
    }

    if (filters.assigneeDiscordId) {
      where.assigneeDiscordId = filters.assigneeDiscordId
    }

    if (filters.openOnly) {
      where.status = {
        in: [IssueStatus.OPEN, IssueStatus.IN_ACTION],
      }
    }

    return prisma.issue.findMany({
      where,
      include: { project: true },
      orderBy: [
        { impact: 'desc' },
        { createdAt: 'desc' },
      ],
    })
  },

  // 이슈 업데이트
  async update(id: string, data: UpdateIssueDto): Promise<Issue> {
    return prisma.issue.update({
      where: { id },
      data,
    })
  },

  // 이슈 상태 변경
  async updateStatus(id: string, status: IssueStatus, resolution?: string): Promise<Issue> {
    const updateData: Prisma.IssueUpdateInput = { status }

    if (status === IssueStatus.RESOLVED) {
      updateData.resolvedAt = new Date()
    }

    if (status === IssueStatus.CLOSED) {
      updateData.closedAt = new Date()
      if (resolution) {
        updateData.resolution = resolution
      }
    }

    return prisma.issue.update({
      where: { id },
      data: updateData,
    })
  },

  // 이슈 삭제
  async delete(id: string): Promise<void> {
    await prisma.issue.delete({
      where: { id },
    })
  },

  // 미조치 이슈 조회 (N일 이상 OPEN 상태)
  async findUnattended(daysThreshold: number): Promise<IssueWithProject[]> {
    const thresholdDate = new Date()
    thresholdDate.setDate(thresholdDate.getDate() - daysThreshold)

    return prisma.issue.findMany({
      where: {
        status: IssueStatus.OPEN,
        createdAt: {
          lt: thresholdDate,
        },
      },
      include: { project: true },
      orderBy: [
        { impact: 'desc' },
        { createdAt: 'asc' },
      ],
    })
  },

  // 마지막 경고 후 N시간 이상 경과한 미조치 이슈 조회
  async findForWarning(hoursThreshold: number, daysUnattended: number): Promise<IssueWithProject[]> {
    const warningThreshold = new Date()
    warningThreshold.setHours(warningThreshold.getHours() - hoursThreshold)

    const unattendedThreshold = new Date()
    unattendedThreshold.setDate(unattendedThreshold.getDate() - daysUnattended)

    return prisma.issue.findMany({
      where: {
        status: IssueStatus.OPEN,
        createdAt: {
          lt: unattendedThreshold,
        },
        OR: [
          { lastWarningAt: null },
          { lastWarningAt: { lt: warningThreshold } },
        ],
      },
      include: { project: true },
    })
  },

  // 경고 발송 시간 업데이트
  async updateWarningTime(id: string): Promise<void> {
    await prisma.issue.update({
      where: { id },
      data: { lastWarningAt: new Date() },
    })
  },

  // Critical 이슈 조회 (활성 상태)
  async findCritical(guildId?: string): Promise<IssueWithProject[]> {
    const where: Prisma.IssueWhereInput = {
      impact: IssueImpact.CRITICAL,
      status: {
        in: [IssueStatus.OPEN, IssueStatus.IN_ACTION],
      },
    }

    if (guildId) {
      where.project = { guildId }
    }

    return prisma.issue.findMany({
      where,
      include: { project: true },
    })
  },

  // 프로젝트별 이슈 통계
  async getStatsByProject(projectId: string): Promise<{
    total: number
    open: number
    inAction: number
    resolved: number
    closed: number
    byImpact: Record<string, number>
  }> {
    const [byStatus, byImpact] = await Promise.all([
      prisma.issue.groupBy({
        by: ['status'],
        where: { projectId },
        _count: { status: true },
      }),
      prisma.issue.groupBy({
        by: ['impact'],
        where: { projectId },
        _count: { impact: true },
      }),
    ])

    const stats = {
      total: 0,
      open: 0,
      inAction: 0,
      resolved: 0,
      closed: 0,
      byImpact: {} as Record<string, number>,
    }

    for (const s of byStatus) {
      const count = s._count.status
      stats.total += count

      switch (s.status) {
        case IssueStatus.OPEN:
          stats.open = count
          break
        case IssueStatus.IN_ACTION:
          stats.inAction = count
          break
        case IssueStatus.RESOLVED:
          stats.resolved = count
          break
        case IssueStatus.CLOSED:
          stats.closed = count
          break
      }
    }

    for (const i of byImpact) {
      stats.byImpact[i.impact] = i._count.impact
    }

    return stats
  },
}
