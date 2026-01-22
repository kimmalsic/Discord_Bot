import { EmbedBuilder, Colors } from 'discord.js'
import { Project } from '@prisma/client'
import { ProjectDetail } from '../services/project.service'
import { ProjectStatus, ProjectStatusLabels } from '../types/enums'
import { formatDate, formatPeriod, getDDay } from '../utils/date'

// Brand Colors
const THEME = {
  PRIMARY: 0x5865F2, // Discord Blurple
  SUCCESS: 0x57F287,
  WARNING: 0xFEE75C,
  ERROR: 0xED4245,
  NEUTRAL: 0x95A5A6,
}

// Status Colors
const statusColors: Record<string, number> = {
  PLANNING: 0x3498DB,      // Blue
  IN_PROGRESS: 0x5865F2,   // Blurple (Active)
  ISSUE: 0xED4245,         // Red
  ON_HOLD: 0x95A5A6,       // Grey
  COMPLETED: 0x57F287,     // Green
}

// Helper: Common Footer
const getFooter = (id: string) => ({ text: `Project ID: ${id}` })

// 프로젝트 생성 완료 Embed
export function createProjectCreatedEmbed(project: Project): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(THEME.SUCCESS)
    .setAuthor({ name: '사업 등록 완료', iconURL: 'https://cdn-icons-png.flaticon.com/512/1087/1087815.png' }) // Generic meaningful icon or remove if none
    .setTitle(project.name)
    .addFields(
      { name: '상태', value: ProjectStatusLabels[project.status as ProjectStatus], inline: true },
      { name: '담당자 (PM)', value: `<@${project.pmDiscordId}>`, inline: true },
      { name: '기간', value: formatPeriod(project.startDate, project.endDate), inline: false },
      { name: '설명', value: project.description || '내용 없음', inline: false },
      { name: '투입 공수', value: (project as any).manHours ? `${(project as any).manHours} M/M` : '-', inline: true },
      { name: '투입 인원', value: (project as any).personnel || '-', inline: true },
    )
    .setFooter(getFooter(project.id))
    .setTimestamp()
}

// 프로젝트 목록 Embed
export function createProjectListEmbed(projects: Project[], guildName?: string): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(THEME.PRIMARY)
    .setAuthor({ name: '사업 현황 목록', iconURL: 'https://cdn-icons-png.flaticon.com/512/2645/2645601.png' })
    .setTitle(guildName || '전체 사업')
    .setTimestamp()

  if (projects.length === 0) {
    embed.setDescription('```\n등록된 사업이 없습니다.\n```')
    return embed
  }

  const description = projects.map((p, idx) => {
    const status = ProjectStatusLabels[p.status as ProjectStatus]
    const dday = getDDay(p.endDate)
    return `**${idx + 1}. ${p.name}**\n> ${status} | PM: <@${p.pmDiscordId}> | ${dday}`
  }).join('\n\n')

  embed.setDescription(description)
  embed.setFooter({ text: `Total: ${projects.length} Projects` })

  return embed
}

// 프로젝트 상세 Embed
export function createProjectDetailEmbed(project: ProjectDetail): EmbedBuilder {
  const statusColor = statusColors[project.status] || THEME.NEUTRAL
  const statusLabel = ProjectStatusLabels[project.status as ProjectStatus]

  const embed = new EmbedBuilder()
    .setColor(statusColor)
    .setAuthor({ name: '사업 상세 정보', iconURL: 'https://cdn-icons-png.flaticon.com/512/1087/1087815.png' })
    .setTitle(project.name)
    .addFields(
      { name: '진행 상태', value: statusLabel, inline: true },
      { name: '담당자 (PM)', value: `<@${project.pmDiscordId}>`, inline: true },
      { name: '진행률', value: `\`${project.stats.progress}%\``, inline: true },
      { name: '사업 기간', value: formatPeriod(project.startDate, project.endDate), inline: false },
    )
    .setTimestamp()

  if (project.description) {
    embed.addFields({ name: '사업 개요', value: `> ${project.description}`, inline: false })
  }

  // 투입 자원 섹션
  if ((project as any).manHours || (project as any).personnel) {
    const info = []
    if ((project as any).manHours) info.push(`**투입 공수:** ${(project as any).manHours} M/M`)
    if ((project as any).personnel) info.push(`**투입 인원:** ${(project as any).personnel}`)

    embed.addFields({ name: '투입 자원', value: info.join('\n'), inline: false })
  }

  // 통계 요약
  const stats = []

  // 일정 통계
  if (project.stats.milestones.total > 0) {
    const { completed, total, delayed } = project.stats.milestones
    let text = `**일정:** ${completed}/${total} 완료`
    if (delayed > 0) text += ` (⚠️ ${delayed}건 지연)`
    stats.push(text)
  }

  // 이슈 통계
  if (project.stats.issues.total > 0) {
    const { open, total, critical } = project.stats.issues
    let text = `**이슈:** ${open}/${total} 미해결`
    if (critical > 0) text += ` (🚨 Critical: ${critical})`
    stats.push(text)
  }

  if (stats.length > 0) {
    embed.addFields({ name: '현황 요약', value: stats.join('\n'), inline: false })
  }

  // 참여자
  if (project.participants.length > 0) {
    const members = project.participants
      .filter(p => p.discordId !== project.pmDiscordId) // PM 제외
      .map(p => `<@${p.discordId}>`)

    if (members.length > 0) {
      embed.addFields({ name: `참여 인원 (${members.length})`, value: members.join(', '), inline: false })
    }
  }

  embed.setFooter(getFooter(project.id))

  return embed
}

// 프로젝트 상태 변경 Embed
export function createProjectStatusChangedEmbed(
  project: Project,
  oldStatus: string,
  newStatus: string
): EmbedBuilder {
  const oldLabel = ProjectStatusLabels[oldStatus as ProjectStatus]
  const newLabel = ProjectStatusLabels[newStatus as ProjectStatus]
  const statusColor = statusColors[newStatus] || THEME.NEUTRAL

  return new EmbedBuilder()
    .setColor(statusColor)
    .setAuthor({ name: '사업 상태 변경', iconURL: 'https://cdn-icons-png.flaticon.com/512/190/190411.png' })
    .setTitle(project.name)
    .setDescription(`사업 상태가 **${oldLabel}**에서 **${newLabel}**로 변경되었습니다.`)
    .setFooter(getFooter(project.id))
    .setTimestamp()
}

// 프로젝트 완료 Embed
export function createProjectCompletedEmbed(project: Project): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(THEME.SUCCESS)
    .setAuthor({ name: '사업 완료', iconURL: 'https://cdn-icons-png.flaticon.com/512/190/190411.png' })
    .setTitle(project.name)
    .setDescription('모든 과정이 마무리되어 사업이 완료 처리되었습니다.')
    .addFields(
      { name: '총 기간', value: formatPeriod(project.startDate, project.endDate), inline: true },
      { name: '담당 PM', value: `<@${project.pmDiscordId}>`, inline: true }
    )
    .setFooter(getFooter(project.id))
    .setTimestamp()
}
