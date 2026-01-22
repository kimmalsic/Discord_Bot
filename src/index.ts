import { config } from './config'
import { createClient, loadCommands, loadEvents, deployCommands } from './client'
import { connectDatabase, disconnectDatabase } from './database'
import { startSchedulers, stopSchedulers } from './schedulers'

// 메인 함수
async function main(): Promise<void> {
  console.log('═'.repeat(50))
  console.log('🚀 사업관리 Discord 봇 시작')
  console.log(`📍 환경: ${config.env}`)
  console.log('═'.repeat(50))

  // 1. 데이터베이스 연결
  await connectDatabase()

  // 2. Discord 클라이언트 생성
  const client = createClient()

  // 3. 명령어 로드
  await loadCommands(client)

  // 4. 이벤트 로드
  await loadEvents(client)

  // 5. 명령어 배포 (개발 환경에서만 자동 배포)
  if (config.isDevelopment) {
    await deployCommands(client)
  }

  // 6. Discord 로그인
  await client.login(config.discord.token)

  // 7. 스케줄러 시작
  startSchedulers(client)

  // 종료 시그널 처리
  const shutdown = async (signal: string) => {
    console.log(`\n📴 ${signal} 시그널 수신, 종료 중...`)
    stopSchedulers()
    await disconnectDatabase()
    client.destroy()
    process.exit(0)
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

// 실행
main().catch(error => {
  console.error('❌ 봇 시작 실패:', error)
  process.exit(1)
})
