import cron from 'node-cron'
import { Client } from 'discord.js'
import { deadlineScheduler } from './deadline.scheduler'
import { issueWatcherScheduler } from './issue-watcher.scheduler'
import { weeklyReportScheduler } from './weekly-report.scheduler'

// 스케줄러 작업 목록
const scheduledTasks: cron.ScheduledTask[] = []

// 스케줄러 시작
export function startSchedulers(client: Client): void {
  console.log('⏰ 스케줄러 시작 중...')

  // 1. 매일 09:00 - D-7, D-1 일정 알림 및 지연 일정 알림
  const deadlineTask = cron.schedule('0 9 * * *', async () => {
    console.log('🔔 일정 알림 스케줄러 실행')
    await deadlineScheduler.run(client)
  }, {
    timezone: 'Asia/Seoul',
  })
  scheduledTasks.push(deadlineTask)

  // 2. 6시간마다 - 3일 이상 미조치 이슈 경고
  const issueTask = cron.schedule('0 */6 * * *', async () => {
    console.log('🔔 이슈 경고 스케줄러 실행')
    await issueWatcherScheduler.run(client)
  }, {
    timezone: 'Asia/Seoul',
  })
  scheduledTasks.push(issueTask)

  // 3. 매주 월요일 09:00 - 주간 요약 리포트
  const weeklyTask = cron.schedule('0 9 * * 1', async () => {
    console.log('📊 주간 리포트 스케줄러 실행')
    await weeklyReportScheduler.run(client)
  }, {
    timezone: 'Asia/Seoul',
  })
  scheduledTasks.push(weeklyTask)

  console.log('✅ 스케줄러 등록 완료:')
  console.log('  - 일정 알림: 매일 09:00')
  console.log('  - 이슈 경고: 6시간마다')
  console.log('  - 주간 리포트: 월요일 09:00')
}

// 스케줄러 중지
export function stopSchedulers(): void {
  console.log('⏹️ 스케줄러 중지 중...')
  for (const task of scheduledTasks) {
    task.stop()
  }
  scheduledTasks.length = 0
  console.log('✅ 스케줄러 중지 완료')
}

// 수동 실행용 (테스트)
export { deadlineScheduler, issueWatcherScheduler, weeklyReportScheduler }
