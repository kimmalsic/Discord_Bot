import { Client } from 'discord.js'
import { issueService, notificationService } from '../services'
import { differenceInDays } from 'date-fns'

// 이슈 감시 스케줄러 (미조치 이슈 경고)
export const issueWatcherScheduler = {
  async run(client: Client): Promise<void> {
    try {
      // 3일 이상 미조치이고, 마지막 경고 후 6시간 이상 경과한 이슈 조회
      const issues = await issueService.findForWarning(6, 3)

      for (const issue of issues) {
        const daysSinceCreation = differenceInDays(new Date(), issue.createdAt)

        const sent = await notificationService.sendIssueWarningNotification(
          client,
          issue,
          daysSinceCreation
        )

        if (sent) {
          await issueService.markWarning(issue.id)
          console.log(`⚠️ 미조치 이슈 경고 발송: ${issue.title} (${issue.project.name}) - ${daysSinceCreation}일 경과`)
        }
      }

      if (issues.length > 0) {
        console.log(`🔔 ${issues.length}개 미조치 이슈 경고 발송 완료`)
      }
    } catch (error) {
      console.error('❌ 이슈 감시 스케줄러 오류:', error)
    }
  },
}
