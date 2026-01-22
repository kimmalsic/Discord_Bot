import { REST, Routes } from 'discord.js'
import { config } from './config'
import { readdirSync } from 'fs'
import { join } from 'path'
import { Command } from './types/command'

// 명령어 수동 배포 스크립트
// 사용법: npm run deploy-commands

async function deployCommands(): Promise<void> {
  const commands: object[] = []
  const commandsPath = join(__dirname, 'commands')
  const commandFolders = readdirSync(commandsPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)

  console.log('📦 명령어 수집 중...')

  for (const folder of commandFolders) {
    const folderPath = join(commandsPath, folder)
    const commandFiles = readdirSync(folderPath)
      .filter(file => file.endsWith('.ts') || file.endsWith('.js'))

    for (const file of commandFiles) {
      const filePath = join(folderPath, file)
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const command = require(filePath)
      const commandModule: Command = command.default || command

      if (commandModule.data) {
        commands.push(commandModule.data.toJSON())
        console.log(`  ✓ /${commandModule.data.name}`)
      }
    }
  }

  console.log(`\n총 ${commands.length}개 명령어 수집 완료`)

  const rest = new REST().setToken(config.discord.token)

  try {
    console.log('\n🔄 Discord API에 명령어 등록 중...')

    if (config.discord.guildId) {
      // 개발 서버에 등록
      await rest.put(
        Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
        { body: commands },
      )
      console.log(`✅ 개발 서버에 명령어 등록 완료 (Guild ID: ${config.discord.guildId})`)
    } else {
      // 전역 등록
      await rest.put(
        Routes.applicationCommands(config.discord.clientId),
        { body: commands },
      )
      console.log('✅ 전역 명령어 등록 완료 (최대 1시간 후 반영)')
    }
  } catch (error) {
    console.error('❌ 명령어 등록 실패:', error)
    process.exit(1)
  }
}

deployCommands()
