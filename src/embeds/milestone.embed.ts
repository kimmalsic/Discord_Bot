import { EmbedBuilder, Colors } from 'discord.js'
import { Milestone } from '@prisma/client'
import { MilestoneWithProject } from '../repositories'
import { MilestoneStatus, MilestoneStatusLabels } from '../types/enums'
import { formatDate, getDDay, getDaysRemaining } from '../utils/date'

const THEME = {
  PRIMARY: 0x5865F2,
  SUCCESS: 0x57F287,
  WARNING: 0xFEE75C,
  ERROR: 0xED4245,
  NEUTRAL: 0x95A5A6,
}

// 마일스톤 상태별 색상
const statusColors: Record<string, number> = {
  SCHEDULED: THEME.PRIMARY, // Blue
  COMPLETED: THEME.SUCCESS, // Green
  DELAYED: THEME.ERROR,     // Red
}

// Common Footer
const getFooter = (id: string) => ({ text: `Milestone ID: ${id}` })

// 마일스톤 생성 완료 Embed
export function createMilestoneCreatedEmbed(milestone: Milestone, projectName: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(THEME.SUCCESS)
    .setAuthor({ name: '일정 등록 완료', iconURL: 'https://cdn-icons-png.flaticon.com/512/2693/2693507.png' })
    .setTitle(milestone.name)
    .addFields(
      { name: '관련 사업', value: projectName, inline: true },
      { name: '목표 일정', value: `${formatDate(milestone.targetDate)} (${getDDay(milestone.targetDate)})`, inline: false },
      { name: '담당자', value: milestone.assigneeDiscordId ? `<@${milestone.assigneeDiscordId}>` : '미지정', inline: true },
    )
    .setFooter(getFooter(milestone.id))
    .setTimestamp()
}

// 마일스톤 목록 Embed
export function createMilestoneListEmbed(
  milestones: MilestoneWithProject[],
  projectName?: string
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(THEME.PRIMARY)
    .setAuthor({ name: '일정 현황 목록', iconURL: 'https://cdn-icons-png.flaticon.com/512/2645/2645601.png' })
    .setTitle(projectName || '전체 일정')
    .setTimestamp()

  if (milestones.length === 0) {
    embed.setDescription('```\n등록된 일정이 없습니다.\n```')
    return embed
  }

  const description = milestones.map((m, idx) => {
    const status = MilestoneStatusLabels[m.status as MilestoneStatus]
    const dday = getDDay(m.targetDate)
    const projectInfo = !projectName ? ` [${m.project.name}]` : ''
    const assignee = m.assigneeDiscordId ? `<@${m.assigneeDiscordId}>` : '-'

    return `**${idx + 1}. ${m.name}**${projectInfo}\n> ${status} | ${dday} | 담당: ${assignee}`
  }).join('\n\n')

  embed.setDescription(description)
  embed.setFooter({ text: `Total: ${milestones.length} Milestones` })

  return embed
}

// 마일스톤 완료 Embed
export function createMilestoneCompletedEmbed(milestone: MilestoneWithProject): EmbedBuilder {
  const wasDelayed = milestone.status === MilestoneStatus.DELAYED

  return new EmbedBuilder()
    .setColor(THEME.SUCCESS)
    .setAuthor({ name: '일정 완료', iconURL: 'https://cdn-icons-png.flaticon.com/512/190/190411.png' })
    .setTitle(milestone.name)
    .addFields(
      { name: '관련 사업', value: milestone.project.name, inline: true },
      { name: '목표일', value: formatDate(milestone.targetDate), inline: true },
      { name: '완료일', value: formatDate(new Date()), inline: true },
      { name: '처리 결과', value: wasDelayed ? '지연 완료 (Delayed)' : '정상 완료 (Completed)', inline: true },
    )
    .setFooter(getFooter(milestone.id))
    .setTimestamp()
}

// D-N 알림 Embed
export function createMilestoneDeadlineEmbed(
  milestone: MilestoneWithProject,
  daysRemaining: number
): EmbedBuilder {
  const color = daysRemaining <= 1 ? THEME.ERROR : THEME.WARNING

  return new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: `일정 마감 임박 (D-${daysRemaining})`, iconURL: 'https://cdn-icons-png.flaticon.com/512/564/564619.png' })
    .setTitle(milestone.name)
    .addFields(
      { name: '관련 사업', value: milestone.project.name, inline: true },
      { name: '목표일', value: formatDate(milestone.targetDate), inline: true },
      { name: '담당자', value: milestone.assigneeDiscordId ? `<@${milestone.assigneeDiscordId}>` : '미지정', inline: true },
    )
    .setDescription(milestone.description ? `> ${milestone.description}` : null)
    .setFooter(getFooter(milestone.id))
    .setTimestamp()
}

// 지연 알림 Embed
export function createMilestoneDelayedEmbed(milestone: MilestoneWithProject): EmbedBuilder {
  const daysDelayed = Math.abs(getDaysRemaining(milestone.targetDate))

  return new EmbedBuilder()
    .setColor(THEME.ERROR)
    .setAuthor({ name: '일정 지연', iconURL: 'https://cdn-icons-png.flaticon.com/512/564/564619.png' })
    .setTitle(milestone.name)
    .setDescription(`일정이 **${daysDelayed}일** 지연되고 있습니다.\n조속한 조치가 필요합니다.`)
    .addFields(
      { name: '관련 사업', value: milestone.project.name, inline: true },
      { name: '원래 목표일', value: formatDate(milestone.targetDate), inline: true },
      { name: '담당 PM', value: `<@${milestone.project.pmDiscordId}>`, inline: true },
      { name: '지정 담당자', value: milestone.assigneeDiscordId ? `<@${milestone.assigneeDiscordId}>` : '미지정', inline: true },
    )
    .setFooter(getFooter(milestone.id))
    .setTimestamp()
}
