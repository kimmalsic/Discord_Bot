import { Client, TextChannel, EmbedBuilder } from 'discord.js'
import { guildSettingsRepository } from '../repositories'
import { MilestoneWithProject, IssueWithProject } from '../repositories'
import {
  createMilestoneDeadlineEmbed,
  createMilestoneDelayedEmbed,
  createIssueWarningEmbed,
  createCriticalIssueEmbed,
  createWeeklyReportEmbed,
} from '../embeds'

// 알림 서비스
export const notificationService = {
  // 알림 채널 가져오기
  async getNotificationChannel(client: Client, guildId: string): Promise<TextChannel | null> {
    const settings = await guildSettingsRepository.findByGuildId(guildId)
    if (!settings?.notificationChannelId) return null

    try {
      const channel = await client.channels.fetch(settings.notificationChannelId)
      if (channel?.isTextBased() && channel.isSendable()) {
        return channel as TextChannel
      }
    } catch (error) {
      console.error(`채널 조회 실패 (${guildId}):`, error)
    }

    return null
  },

  // D-7/D-1 일정 알림 발송
  async sendMilestoneDeadlineNotification(
    client: Client,
    milestone: MilestoneWithProject,
    daysRemaining: number
  ): Promise<boolean> {
    const channel = await this.getNotificationChannel(client, milestone.project.guildId)
    if (!channel) return false

    try {
      const embed = createMilestoneDeadlineEmbed(milestone, daysRemaining)
      const mention = milestone.assigneeDiscordId
        ? `<@${milestone.assigneeDiscordId}>`
        : ''

      await channel.send({
        content: mention ? `${mention} 일정 알림입니다.` : undefined,
        embeds: [embed],
      })

      return true
    } catch (error) {
      console.error(`일정 알림 발송 실패:`, error)
      return false
    }
  },

  // 지연 일정 알림 발송 (PM 멘션)
  async sendMilestoneDelayedNotification(
    client: Client,
    milestone: MilestoneWithProject
  ): Promise<boolean> {
    const channel = await this.getNotificationChannel(client, milestone.project.guildId)
    if (!channel) return false

    try {
      const embed = createMilestoneDelayedEmbed(milestone)
      const pmMention = `<@${milestone.project.pmDiscordId}>`

      await channel.send({
        content: `${pmMention} ⚠️ 지연된 일정이 있습니다!`,
        embeds: [embed],
      })

      return true
    } catch (error) {
      console.error(`지연 알림 발송 실패:`, error)
      return false
    }
  },

  // 미조치 이슈 경고 발송
  async sendIssueWarningNotification(
    client: Client,
    issue: IssueWithProject,
    daysSinceCreation: number
  ): Promise<boolean> {
    const channel = await this.getNotificationChannel(client, issue.project.guildId)
    if (!channel) return false

    try {
      const embed = createIssueWarningEmbed(issue, daysSinceCreation)
      const mentions: string[] = []

      if (issue.assigneeDiscordId) {
        mentions.push(`<@${issue.assigneeDiscordId}>`)
      }
      mentions.push(`<@${issue.project.pmDiscordId}>`)

      await channel.send({
        content: `${mentions.join(' ')} ⚠️ 미조치 이슈 경고!`,
        embeds: [embed],
      })

      return true
    } catch (error) {
      console.error(`이슈 경고 발송 실패:`, error)
      return false
    }
  },

  // Critical 이슈 즉시 알림 발송 (@here)
  async sendCriticalIssueNotification(
    client: Client,
    issue: IssueWithProject
  ): Promise<boolean> {
    const channel = await this.getNotificationChannel(client, issue.project.guildId)
    if (!channel) return false

    try {
      const embed = createCriticalIssueEmbed(issue)

      await channel.send({
        content: `@here 🚨 **심각한 이슈가 발생했습니다!**`,
        embeds: [embed],
      })

      return true
    } catch (error) {
      console.error(`Critical 이슈 알림 발송 실패:`, error)
      return false
    }
  },

  // 주간 요약 리포트 발송
  async sendWeeklyReport(
    client: Client,
    guildId: string,
    reportData: {
      projects: {
        total: number
        active: number
        completed: number
        withIssues: number
      }
      milestones: {
        completed: number
        delayed: number
        upcoming: number
      }
      issues: {
        opened: number
        closed: number
        critical: number
      }
    }
  ): Promise<boolean> {
    const channel = await this.getNotificationChannel(client, guildId)
    if (!channel) return false

    try {
      const embed = createWeeklyReportEmbed(reportData)

      await channel.send({
        content: '📊 **주간 사업 현황 리포트**',
        embeds: [embed],
      })

      return true
    } catch (error) {
      console.error(`주간 리포트 발송 실패:`, error)
      return false
    }
  },

  // 일반 알림 발송
  async sendNotification(
    client: Client,
    guildId: string,
    embed: EmbedBuilder,
    content?: string
  ): Promise<boolean> {
    const channel = await this.getNotificationChannel(client, guildId)
    if (!channel) return false

    try {
      await channel.send({
        content,
        embeds: [embed],
      })
      return true
    } catch (error) {
      console.error(`알림 발송 실패:`, error)
      return false
    }
  },
}
