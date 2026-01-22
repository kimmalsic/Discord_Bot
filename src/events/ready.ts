import { Events } from 'discord.js'
import { ExtendedClient } from '../client'

// 봇 준비 완료 이벤트
export default {
  name: Events.ClientReady,
  once: true,
  execute(client: ExtendedClient) {
    console.log('═'.repeat(50))
    console.log(`🤖 ${client.user?.tag} 봇이 준비되었습니다!`)
    console.log(`📊 ${client.guilds.cache.size}개 서버에서 활동 중`)
    console.log(`📦 ${client.commands.size}개 명령어 로드됨`)
    console.log('═'.repeat(50))

    // 봇 상태 설정
    client.user?.setActivity('/사업 목록으로 사업을 관리하세요', {
      type: 3, // Watching
    })
  },
}
