import { Client } from 'discord.js'
import { notificationService } from '../services'
import { prisma } from '../database'
import { guildSettingsRepository } from '../repositories'
import { subDays, startOfWeek, endOfWeek } from 'date-fns'
import { ProjectStatus, MilestoneStatus, IssueStatus } from '../types/enums'

// 주간 리포트 스케줄러
export const weeklyReportScheduler = {
  async run(client: Client): Promise<void> {
    try {
      // 알림 채널이 설정된 서버 조회
      const guildsWithNotification = await guildSettingsRepository.findWithNotificationChannel()

      for (const settings of guildsWithNotification) {
        const reportData = await generateReportData(settings.guildId)

        const sent = await notificationService.sendWeeklyReport(
          client,
          settings.guildId,
          reportData
        )

        if (sent) {
          console.log(`📊 주간 리포트 발송: Guild ${settings.guildId}`)
        }
      }

      console.log(`📊 ${guildsWithNotification.length}개 서버에 주간 리포트 발송 완료`)
    } catch (error) {
      console.error('❌ 주간 리포트 스케줄러 오류:', error)
    }
  },
}

// 주간 리포트 데이터 생성
async function generateReportData(guildId: string): Promise<{
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
}> {
  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }) // 월요일 시작
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
  const lastWeekStart = subDays(weekStart, 7)

  // 프로젝트 통계
  const [totalProjects, activeProjects, completedThisWeek, projectsWithIssues] = await Promise.all([
    prisma.project.count({ where: { guildId } }),
    prisma.project.count({
      where: {
        guildId,
        status: { notIn: [ProjectStatus.COMPLETED] },
      },
    }),
    prisma.project.count({
      where: {
        guildId,
        status: ProjectStatus.COMPLETED,
        updatedAt: { gte: lastWeekStart, lte: weekEnd },
      },
    }),
    prisma.project.count({
      where: {
        guildId,
        status: ProjectStatus.ISSUE,
      },
    }),
  ])

  // 마일스톤 통계
  const [completedMilestones, delayedMilestones, upcomingMilestones] = await Promise.all([
    prisma.milestone.count({
      where: {
        project: { guildId },
        status: MilestoneStatus.COMPLETED,
        completedAt: { gte: lastWeekStart, lte: weekEnd },
      },
    }),
    prisma.milestone.count({
      where: {
        project: { guildId },
        status: MilestoneStatus.DELAYED,
      },
    }),
    prisma.milestone.count({
      where: {
        project: { guildId },
        status: MilestoneStatus.SCHEDULED,
        targetDate: { gte: now, lte: subDays(now, -7) }, // 다음 7일
      },
    }),
  ])

  // 이슈 통계
  const [openedIssues, closedIssues, criticalIssues] = await Promise.all([
    prisma.issue.count({
      where: {
        project: { guildId },
        createdAt: { gte: lastWeekStart, lte: weekEnd },
      },
    }),
    prisma.issue.count({
      where: {
        project: { guildId },
        status: IssueStatus.CLOSED,
        closedAt: { gte: lastWeekStart, lte: weekEnd },
      },
    }),
    prisma.issue.count({
      where: {
        project: { guildId },
        impact: 'CRITICAL',
        status: { in: [IssueStatus.OPEN, IssueStatus.IN_ACTION] },
      },
    }),
  ])

  return {
    projects: {
      total: totalProjects,
      active: activeProjects,
      completed: completedThisWeek,
      withIssues: projectsWithIssues,
    },
    milestones: {
      completed: completedMilestones,
      delayed: delayedMilestones,
      upcoming: upcomingMilestones,
    },
    issues: {
      opened: openedIssues,
      closed: closedIssues,
      critical: criticalIssues,
    },
  }
}
