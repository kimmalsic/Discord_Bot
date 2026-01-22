import { Document, Prisma } from '@prisma/client'
import { prisma } from '../database'
import { CreateDocumentDto } from '../types/dto'

// 문서 조회 필터
export interface DocumentFilters {
  projectId?: string
  guildId?: string
  type?: string
}

// 문서 with 프로젝트
export type DocumentWithProject = Prisma.DocumentGetPayload<{
  include: { project: true }
}>

// 문서 Repository
export const documentRepository = {
  // 문서 생성
  async create(data: CreateDocumentDto): Promise<Document> {
    return prisma.document.create({
      data,
    })
  },

  // ID로 문서 조회
  async findById(id: string): Promise<Document | null> {
    return prisma.document.findUnique({
      where: { id },
    })
  },

  // ID로 문서 조회 (프로젝트 포함)
  async findByIdWithProject(id: string): Promise<DocumentWithProject | null> {
    return prisma.document.findUnique({
      where: { id },
      include: { project: true },
    })
  },

  // 프로젝트별 문서 조회
  async findByProjectId(projectId: string): Promise<Document[]> {
    return prisma.document.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    })
  },

  // 필터로 문서 목록 조회
  async findMany(filters: DocumentFilters): Promise<DocumentWithProject[]> {
    const where: Prisma.DocumentWhereInput = {}

    if (filters.projectId) {
      where.projectId = filters.projectId
    }

    if (filters.guildId) {
      where.project = {
        guildId: filters.guildId,
      }
    }

    if (filters.type) {
      where.type = filters.type
    }

    return prisma.document.findMany({
      where,
      include: { project: true },
      orderBy: { createdAt: 'desc' },
    })
  },

  // 문서 삭제
  async delete(id: string): Promise<void> {
    await prisma.document.delete({
      where: { id },
    })
  },

  // 프로젝트별 문서 유형별 수
  async countByProjectAndType(projectId: string): Promise<Record<string, number>> {
    const documents = await prisma.document.groupBy({
      by: ['type'],
      where: { projectId },
      _count: { type: true },
    })

    const counts: Record<string, number> = {}
    for (const doc of documents) {
      counts[doc.type] = doc._count.type
    }

    return counts
  },

  // 프로젝트별 문서 수
  async countByProject(projectId: string): Promise<number> {
    return prisma.document.count({
      where: { projectId },
    })
  },
}
