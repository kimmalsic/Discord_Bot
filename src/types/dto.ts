import { z } from 'zod'
import { ProjectStatus, MilestoneStatus, IssueImpact, IssueStatus } from './enums'

// ============================================
// 사업 (Project) DTO
// ============================================

export const CreateProjectDto = z.object({
  name: z.string().min(1, '사업명을 입력해주세요').max(100, '사업명은 100자 이내로 입력해주세요'),
  description: z.string().max(1000, '설명은 1000자 이내로 입력해주세요').optional(),
  pmDiscordId: z.string(),
  startDate: z.date(),
  endDate: z.date(),
  guildId: z.string(),
  channelId: z.string().optional(),
  participants: z.array(z.string()).optional(), // Discord ID 배열
  manHours: z.number().optional(), // 투입 공수
  personnel: z.string().optional(), // 투입 인원
})

export type CreateProjectDto = z.infer<typeof CreateProjectDto>

export const UpdateProjectDto = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
  pmDiscordId: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  manHours: z.number().optional(),
  personnel: z.string().optional(),
  status: z.enum([
    ProjectStatus.PLANNING,
    ProjectStatus.IN_PROGRESS,
    ProjectStatus.ISSUE,
    ProjectStatus.ON_HOLD,
    ProjectStatus.COMPLETED,
  ]).optional(),
  channelId: z.string().optional(),
})

export type UpdateProjectDto = z.infer<typeof UpdateProjectDto>

// ============================================
// 일정 (Milestone) DTO
// ============================================

export const CreateMilestoneDto = z.object({
  projectId: z.string(),
  name: z.string().min(1, '일정명을 입력해주세요').max(100, '일정명은 100자 이내로 입력해주세요'),
  description: z.string().max(1000, '설명은 1000자 이내로 입력해주세요').optional(),
  targetDate: z.date(),
  assigneeDiscordId: z.string().optional(),
})

export type CreateMilestoneDto = z.infer<typeof CreateMilestoneDto>

export const UpdateMilestoneDto = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
  targetDate: z.date().optional(),
  assigneeDiscordId: z.string().optional(),
  status: z.enum([
    MilestoneStatus.SCHEDULED,
    MilestoneStatus.COMPLETED,
    MilestoneStatus.DELAYED,
  ]).optional(),
})

export type UpdateMilestoneDto = z.infer<typeof UpdateMilestoneDto>

// ============================================
// 이슈 (Issue) DTO
// ============================================

export const CreateIssueDto = z.object({
  projectId: z.string(),
  title: z.string().min(1, '이슈 제목을 입력해주세요').max(200, '제목은 200자 이내로 입력해주세요'),
  content: z.string().min(1, '이슈 내용을 입력해주세요').max(2000, '내용은 2000자 이내로 입력해주세요'),
  assigneeDiscordId: z.string().optional(),
  impact: z.enum([
    IssueImpact.LOW,
    IssueImpact.MEDIUM,
    IssueImpact.HIGH,
    IssueImpact.CRITICAL,
  ]).default(IssueImpact.MEDIUM),
})

export type CreateIssueDto = z.infer<typeof CreateIssueDto>

export const UpdateIssueDto = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(2000).optional(),
  assigneeDiscordId: z.string().optional(),
  impact: z.enum([
    IssueImpact.LOW,
    IssueImpact.MEDIUM,
    IssueImpact.HIGH,
    IssueImpact.CRITICAL,
  ]).optional(),
  status: z.enum([
    IssueStatus.OPEN,
    IssueStatus.IN_ACTION,
    IssueStatus.RESOLVED,
    IssueStatus.CLOSED,
  ]).optional(),
  resolution: z.string().max(2000).optional(),
})

export type UpdateIssueDto = z.infer<typeof UpdateIssueDto>

// ============================================
// 의사결정 (Decision) DTO
// ============================================

export const CreateDecisionDto = z.object({
  projectId: z.string(),
  content: z.string().min(1, '결정 내용을 입력해주세요').max(2000, '내용은 2000자 이내로 입력해주세요'),
  reason: z.string().max(2000, '사유는 2000자 이내로 입력해주세요').optional(),
  deciderDiscordId: z.string(),
  relatedLinks: z.array(z.string().url()).optional(),
})

export type CreateDecisionDto = z.infer<typeof CreateDecisionDto>

// ============================================
// 문서 (Document) DTO
// ============================================

export const CreateDocumentDto = z.object({
  projectId: z.string(),
  name: z.string().min(1, '문서명을 입력해주세요').max(200, '문서명은 200자 이내로 입력해주세요'),
  type: z.string(),
  url: z.string().url('올바른 URL을 입력해주세요'),
  registrantDiscordId: z.string(),
})

export type CreateDocumentDto = z.infer<typeof CreateDocumentDto>

// ============================================
// 서버 설정 (GuildSettings) DTO
// ============================================

export const UpdateGuildSettingsDto = z.object({
  notificationChannelId: z.string().optional(),
  adminRoleId: z.string().optional(),
  pmRoleId: z.string().optional(),
  timezone: z.string().optional(),
})

export type UpdateGuildSettingsDto = z.infer<typeof UpdateGuildSettingsDto>
