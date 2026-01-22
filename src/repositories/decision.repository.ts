import { Decision, Prisma } from '@prisma/client'
import { prisma } from '../database'
import { CreateDecisionDto } from '../types/dto'

// 의사결정 with 프로젝트
export type DecisionWithProject = Prisma.DecisionGetPayload<{
  include: { project: true }
}>

// 의사결정 Repository
export const decisionRepository = {
  // 의사결정 생성
  async create(data: CreateDecisionDto): Promise<Decision> {
    const { relatedLinks, ...rest } = data
    return prisma.decision.create({
      data: {
        ...rest,
        relatedLinks: relatedLinks ? JSON.stringify(relatedLinks) : null,
      },
    })
  },

  // ID로 의사결정 조회
  async findById(id: string): Promise<Decision | null> {
    return prisma.decision.findUnique({
      where: { id },
    })
  },

  // ID로 의사결정 조회 (프로젝트 포함)
  async findByIdWithProject(id: string): Promise<DecisionWithProject | null> {
    return prisma.decision.findUnique({
      where: { id },
      include: { project: true },
    })
  },

  // 프로젝트별 의사결정 조회
  async findByProjectId(projectId: string): Promise<Decision[]> {
    return prisma.decision.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    })
  },

  // 서버별 최근 의사결정 조회
  async findRecentByGuild(guildId: string, limit: number = 10): Promise<DecisionWithProject[]> {
    return prisma.decision.findMany({
      where: {
        project: {
          guildId,
        },
      },
      include: { project: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  },

  // 의사결정 삭제
  async delete(id: string): Promise<void> {
    await prisma.decision.delete({
      where: { id },
    })
  },

  // 프로젝트별 의사결정 수
  async countByProject(projectId: string): Promise<number> {
    return prisma.decision.count({
      where: { projectId },
    })
  },
}

// 관련 링크 파싱 헬퍼
export function parseRelatedLinks(linksJson: string | null): string[] {
  if (!linksJson) return []
  try {
    return JSON.parse(linksJson)
  } catch {
    return []
  }
}
