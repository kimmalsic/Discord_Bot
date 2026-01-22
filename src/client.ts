import { Client, Collection, GatewayIntentBits, REST, Routes } from 'discord.js'
import { config } from './config'
import { Command } from './types/command'
import { readdirSync } from 'fs'
import { join } from 'path'

// 명령어 컬렉션을 가진 확장된 클라이언트
export interface ExtendedClient extends Client {
  commands: Collection<string, Command>
}

// Discord 클라이언트 생성
export function createClient(): ExtendedClient {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
    ],
  }) as ExtendedClient

  // 명령어 컬렉션 초기화
  client.commands = new Collection()

  return client
}

// 명령어 로드
export async function loadCommands(client: ExtendedClient): Promise<void> {
  const commandsPath = join(__dirname, 'commands')
  const commandFolders = readdirSync(commandsPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)

  for (const folder of commandFolders) {
    const folderPath = join(commandsPath, folder)
    const commandFiles = readdirSync(folderPath)
      .filter(file => file.endsWith('.ts') || file.endsWith('.js'))

    for (const file of commandFiles) {
      const filePath = join(folderPath, file)
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const command = require(filePath)

      // default export 또는 named export 지원
      const commandModule = command.default || command

      if (commandModule.data && commandModule.execute) {
        client.commands.set(commandModule.data.name, commandModule)
        console.log(`📦 명령어 로드: /${commandModule.data.name}`)
      } else {
        console.warn(`⚠️ ${filePath} 파일에 data 또는 execute가 없습니다`)
      }
    }
  }

  console.log(`✅ ${client.commands.size}개 명령어 로드 완료`)
}

// 이벤트 로드
export async function loadEvents(client: ExtendedClient): Promise<void> {
  const eventsPath = join(__dirname, 'events')
  const eventFiles = readdirSync(eventsPath)
    .filter(file => file.endsWith('.ts') || file.endsWith('.js'))

  for (const file of eventFiles) {
    const filePath = join(eventsPath, file)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const event = require(filePath)
    const eventModule = event.default || event

    if (eventModule.once) {
      client.once(eventModule.name, (...args) => eventModule.execute(...args))
    } else {
      client.on(eventModule.name, (...args) => eventModule.execute(...args))
    }
    console.log(`📌 이벤트 로드: ${eventModule.name}`)
  }
}

// Slash Command 등록 (Discord API에 배포)
export async function deployCommands(client: ExtendedClient): Promise<void> {
  const commands = client.commands.map(command => command.data.toJSON())

  const rest = new REST().setToken(config.discord.token)

  try {
    console.log(`🔄 ${commands.length}개 명령어 등록 중...`)

    if (config.discord.guildId) {
      // 개발 환경: 특정 서버에만 등록 (즉시 반영)
      await rest.put(
        Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
        { body: commands },
      )
      console.log(`✅ 개발 서버에 명령어 등록 완료 (Guild ID: ${config.discord.guildId})`)
    } else {
      // 프로덕션: 전역 등록 (최대 1시간 소요)
      await rest.put(
        Routes.applicationCommands(config.discord.clientId),
        { body: commands },
      )
      console.log('✅ 전역 명령어 등록 완료')
    }
  } catch (error: any) {
    console.error('❌ 명령어 등록 실패:', error)

    // Missing Access 에러 처리
    if (error.code === 50001) {
      console.error('⚠️ "Missing Access" 오류가 발생했습니다.')
      console.error('  1. 봇 초대 링크에 "applications.commands" 스코프가 포함되었는지 확인하세요.')
      console.error('  2. 봇이 해당 서버(Guild ID)에 초대되었는지 확인하세요.')
      console.error('  3. .env 파일의 DISCORD_GUILD_ID가 올바른지 확인하세요.')
    }

    throw error
  }
}
