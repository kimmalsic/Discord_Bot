import { EmbedBuilder, Colors } from 'discord.js'
import { Issue } from '@prisma/client'
import { IssueWithProject } from '../repositories'
import {
  IssueStatus,
  IssueImpact,
  IssueStatusLabels,
  IssueImpactLabels,
} from '../types/enums'
import { formatDate, formatRelativeTime } from '../utils/date'

const THEME = {
  PRIMARY: 0x5865F2,
  SUCCESS: 0x57F287,
  WARNING: 0xFEE75C,
  ERROR: 0xED4245,
  NEUTRAL: 0x95A5A6,
}

// 이슈 영향도별 색상
const impactColors: Record<string, number> = {
  LOW: THEME.SUCCESS,      // Green
  MEDIUM: THEME.WARNING,   // Yellow
  HIGH: 0xE67E22,          // Orange
  CRITICAL: THEME.ERROR,   // Red
}

// Common Footer
const getFooter = (id: string) => ({ text: `Issue ID: ${id}` })

// 이슈 생성 완료 Embed
export function createIssueCreatedEmbed(issue: Issue, projectName: string): EmbedBuilder {
  const color = impactColors[issue.impact] || THEME.NEUTRAL

  return new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: '신규 이슈 등록', iconURL: 'https://cdn-icons-png.flaticon.com/512/1087/1087815.png' })
    .setTitle(issue.title)
    .setDescription(issue.content.length > 200 ? issue.content.substring(0, 200) + '...' : issue.content)
    .addFields(
      { name: '관련 사업', value: projectName, inline: true },
      { name: '영향도', value: IssueImpactLabels[issue.impact as IssueImpact], inline: true },
      { name: '담당자', value: issue.assigneeDiscordId ? `<@${issue.assigneeDiscordId}>` : '미지정', inline: true },
    )
    .setFooter(getFooter(issue.id))
    .setTimestamp()
}

// 이슈 목록 Embed
export function createIssueListEmbed(
  issues: IssueWithProject[],
  projectName?: string
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(THEME.PRIMARY)
    .setAuthor({ name: '이슈 현황 목록', iconURL: 'https://cdn-icons-png.flaticon.com/512/2645/2645601.png' })
    .setTitle(projectName || '전체 이슈')
    .setTimestamp()

  if (issues.length === 0) {
    embed.setDescription('```\n등록된 이슈가 없습니다.\n```')
    return embed
  }

  const description = issues.map((i, idx) => {
    const impact = IssueImpactLabels[i.impact as IssueImpact]
    const status = IssueStatusLabels[i.status as IssueStatus]
    const projectInfo = !projectName ? ` [${i.project.name}]` : ''
    const assignee = i.assigneeDiscordId ? `<@${i.assigneeDiscordId}>` : '-'

    return `**${idx + 1}. ${i.title}**${projectInfo}\n> ${status} | ${impact} | 담당: ${assignee}`
  }).join('\n\n')

  embed.setDescription(description)
  embed.setFooter({ text: `Total: ${issues.length} Issues` })

  return embed
}

// 이슈 상세 Embed
export function createIssueDetailEmbed(issue: IssueWithProject): EmbedBuilder {
  const color = impactColors[issue.impact] || THEME.NEUTRAL

  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: '이슈 상세 정보', iconURL: 'https://cdn-icons-png.flaticon.com/512/1087/1087815.png' })
    .setTitle(issue.title)
    .addFields(
      { name: '관련 사업', value: issue.project.name, inline: true },
      { name: '영향도', value: IssueImpactLabels[issue.impact as IssueImpact], inline: true },
      { name: '현재 상태', value: IssueStatusLabels[issue.status as IssueStatus], inline: true },
      { name: '담당자', value: issue.assigneeDiscordId ? `<@${issue.assigneeDiscordId}>` : '미지정', inline: true },
      { name: '등록 시점', value: formatRelativeTime(issue.createdAt), inline: true },
    )
    .setTimestamp()

  // 내용
  embed.addFields({ name: '내용', value: `> ${issue.content}`, inline: false })

  if (issue.resolution) {
    embed.addFields({ name: '조치 결과', value: `> ${issue.resolution}`, inline: false })
  }

  embed.setFooter(getFooter(issue.id))

  return embed
}

// 이슈 상태 변경 Embed
export function createIssueStatusChangedEmbed(
  issue: IssueWithProject,
  oldStatus: string,
  newStatus: string
): EmbedBuilder {
  const oldLabel = IssueStatusLabels[oldStatus as IssueStatus]
  const newLabel = IssueStatusLabels[newStatus as IssueStatus]
  const color = newStatus === 'CLOSED' || newStatus === 'RESOLVED' ? THEME.SUCCESS : (impactColors[issue.impact] || THEME.NEUTRAL)

  return new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: '이슈 상태 변경', iconURL: 'https://cdn-icons-png.flaticon.com/512/190/190411.png' })
    .setTitle(issue.title)
    .setDescription(`이슈 상태가 **${oldLabel}**에서 **${newLabel}**로 변경되었습니다.`)
    .addFields(
      { name: '관련 사업', value: issue.project.name, inline: true }
    )
    .setFooter(getFooter(issue.id))
    .setTimestamp()
}

// 이슈 종료 Embed
export function createIssueClosedEmbed(issue: IssueWithProject): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(THEME.SUCCESS)
    .setAuthor({ name: '이슈 종료', iconURL: 'https://cdn-icons-png.flaticon.com/512/190/190411.png' })
    .setTitle(issue.title)
    .setDescription('이슈가 해결되어 종료 처리되었습니다.')
    .addFields(
      { name: '관련 사업', value: issue.project.name, inline: true },
      { name: '영향도', value: IssueImpactLabels[issue.impact as IssueImpact], inline: true },
    )
    .addFields({ name: '조치 내용', value: issue.resolution ? `> ${issue.resolution}` : '> 내용 없음', inline: false })
    .setFooter(getFooter(issue.id))
    .setTimestamp()
}

// 미조치 이슈 경고 Embed
export function createIssueWarningEmbed(
  issue: IssueWithProject,
  daysSinceCreation: number
): EmbedBuilder {
  const color = impactColors[issue.impact] || THEME.WARNING

  return new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: '장기 미조치 이슈 알림', iconURL: 'https://cdn-icons-png.flaticon.com/512/564/564619.png' })
    .setTitle(issue.title)
    .setDescription(`이슈가 **${daysSinceCreation}일** 동안 조치되지 않고 있습니다.\n담당자는 확인 후 조치 부탁드립니다.`)
    .addFields(
      { name: '관련 사업', value: issue.project.name, inline: true },
      { name: '영향도', value: IssueImpactLabels[issue.impact as IssueImpact], inline: true },
      { name: '담당자', value: issue.assigneeDiscordId ? `<@${issue.assigneeDiscordId}>` : '미지정', inline: true },
    )
    .setFooter(getFooter(issue.id))
    .setTimestamp()
}

// Critical 이슈 알림 Embed
export function createCriticalIssueEmbed(issue: IssueWithProject): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(THEME.ERROR)
    .setAuthor({ name: 'Critical 이슈 발생', iconURL: 'https://cdn-icons-png.flaticon.com/512/564/564619.png' })
    .setTitle(issue.title)
    .setDescription('🚨 **긴급 조치**가 필요한 이슈가 등록되었습니다.')
    .addFields(
      { name: '관련 사업', value: issue.project.name, inline: true },
      { name: '담당 PM', value: `<@${issue.project.pmDiscordId}>`, inline: true },
      { name: '지정 담당자', value: issue.assigneeDiscordId ? `<@${issue.assigneeDiscordId}>` : '미지정', inline: true },
    )
    .addFields({ name: '이슈 내용', value: `> ${issue.content}`, inline: false })
    .setFooter(getFooter(issue.id))
    .setTimestamp()
}
