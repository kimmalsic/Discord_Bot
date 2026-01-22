import { Project, Prisma } from '@prisma/client'
import { prisma } from '../database'
import { CreateProjectDto, UpdateProjectDto } from '../types/dto'
import { ProjectStatus } from '../types/enums'

// 프로젝트 조회 필터
export interface ProjectFilters {
  guildId: string
  status?: ProjectStatus
  pmDiscordId?: string
  participantDiscordId?: string
  search?: string
}

// 프로젝트 상세 정보 (관계 포함)
export type ProjectWithRelations = Prisma.ProjectGetPayload<{
  include: {
    participants: true
    milestones: true
    issues: true
    decisions: true
    documents: true
  }
}>

// 프로젝트 Repository
export const projectRepository = {
  // 프로젝트 생성
  async create(data: CreateProjectDto): Promise<Project> {
    const { participants, ...projectData } = data

    return prisma.project.create({
      data: {
        ...projectData,
        participants: participants ? {
          create: participants.map(discordId => ({
            discordId,
            role: discordId === data.pmDiscordId ? 'PM' : 'MEMBER',
          })),
        } : undefined,
      },
    })
  },

  // ID로 프로젝트 조회
  async findById(id: string): Promise<Project | null> {
    return prisma.project.findUnique({
      where: { id },
    })
  },

  // ID로 프로젝트 상세 조회 (관계 포함)
  async findByIdWithRelations(id: string): Promise<ProjectWithRelations | null> {
    return prisma.project.findUnique({
      where: { id },
      include: {
        participants: true,
        milestones: {
          orderBy: { targetDate: 'asc' },
        },
        issues: {
          orderBy: { createdAt: 'desc' },
        },
        decisions: {
          orderBy: { createdAt: 'desc' },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })
  },

  // 필터로 프로젝트 목록 조회
  async findMany(filters: ProjectFilters): Promise<Project[]> {
    const where: Prisma.ProjectWhereInput = {
      guildId: filters.guildId,
    }

    if (filters.status) {
      where.status = filters.status
    }

    if (filters.pmDiscordId) {
      where.pmDiscordId = filters.pmDiscordId
    }

    if (filters.participantDiscordId) {
      where.participants = {
        some: {
          discordId: filters.participantDiscordId,
        },
      }
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { description: { contains: filters.search } },
      ]
    }

    return prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
  },

  // 프로젝트 업데이트
  async update(id: string, data: UpdateProjectDto): Promise<Project> {
    return prisma.project.update({
      where: { id },
      data,
    })
  },

  // 프로젝트 삭제
  async delete(id: string): Promise<void> {
    await prisma.project.delete({
      where: { id },
    })
  },

  // 참여자 추가
  async addParticipant(projectId: string, discordId: string, role: string = 'MEMBER'): Promise<void> {
    await prisma.projectParticipant.create({
      data: {
        projectId,
        discordId,
        role,
      },
    })
  },

  // 참여자 제거
  async removeParticipant(projectId: string, discordId: string): Promise<void> {
    await prisma.projectParticipant.delete({
      where: {
        projectId_discordId: {
          projectId,
          discordId,
        },
      },
    })
  },

  // 서버의 활성 프로젝트 수 조회
  async countActiveByGuild(guildId: string): Promise<number> {
    return prisma.project.count({
      where: {
        guildId,
        status: {
          notIn: ['COMPLETED'],
        },
      },
    })
  },

  // 서버의 프로젝트 통계 조회
  async getStatsByGuild(guildId: string): Promise<Record<string, number>> {
    const projects = await prisma.project.groupBy({
      by: ['status'],
      where: { guildId },
      _count: { status: true },
    })

    const stats: Record<string, number> = {}
    for (const project of projects) {
      stats[project.status] = project._count.status
    }

    return stats
  },
}
