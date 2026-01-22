import { Client } from 'discord.js'
import { milestoneService, notificationService } from '../services'
import { getDaysRemaining } from '../utils/date'

// 일정 마감 알림 스케줄러
export const deadlineScheduler = {
  async run(client: Client): Promise<void> {
    try {
      // 1. 지연된 마일스톤 상태 자동 업데이트
      const delayedCount = await milestoneService.updateDelayedStatus()
      if (delayedCount > 0) {
        console.log(`📅 ${delayedCount}개 일정이 지연 상태로 변경됨`)
      }

      // 2. D-7 알림 발송
      const d7Milestones = await milestoneService.findForD7Notification()
      for (const milestone of d7Milestones) {
        const sent = await notificationService.sendMilestoneDeadlineNotification(
          client,
          milestone,
          7
        )
        if (sent) {
          await milestoneService.markNotified(milestone.id, 'D7')
          console.log(`✅ D-7 알림 발송: ${milestone.name} (${milestone.project.name})`)
        }
      }

      // 3. D-1 알림 발송
      const d1Milestones = await milestoneService.findForD1Notification()
      for (const milestone of d1Milestones) {
        const sent = await notificationService.sendMilestoneDeadlineNotification(
          client,
          milestone,
          1
        )
        if (sent) {
          await milestoneService.markNotified(milestone.id, 'D1')
          console.log(`✅ D-1 알림 발송: ${milestone.name} (${milestone.project.name})`)
        }
      }

      // 4. 지연 알림 발송 (PM 멘션)
      const delayedMilestones = await milestoneService.findDelayed()
      for (const milestone of delayedMilestones) {
        // 이미 지연 알림을 받지 않은 경우만
        if (!milestone.notifiedDelayed) {
          const sent = await notificationService.sendMilestoneDelayedNotification(
            client,
            milestone
          )
          if (sent) {
            await milestoneService.markNotified(milestone.id, 'DELAYED')
            console.log(`⚠️ 지연 알림 발송: ${milestone.name} (${milestone.project.name})`)
          }
        }
      }

      console.log('📅 일정 알림 스케줄러 완료')
    } catch (error) {
      console.error('❌ 일정 알림 스케줄러 오류:', error)
    }
  },
}
