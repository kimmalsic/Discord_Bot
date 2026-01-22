import { Events, Interaction, ChatInputCommandInteraction } from 'discord.js'
import { ExtendedClient } from '../client'

// 인터랙션 생성 이벤트 (명령어 실행)
export default {
  name: Events.InteractionCreate,
  once: false,
  async execute(interaction: Interaction) {
    // Slash Command가 아니면 무시 (하지만 Autocomplete는 처리해야 함)
    if (interaction.isAutocomplete()) {
      const client = interaction.client as ExtendedClient
      const command = client.commands.get(interaction.commandName)

      if (!command) return

      try {
        if (command.autocomplete) {
          await command.autocomplete(interaction)
        }
      } catch (error) {
        console.error(`❌ 자동완성 오류 (/${interaction.commandName}):`, error)
      }
      return
    }

    // Slash Command가 아니면 무시
    if (!interaction.isChatInputCommand()) return

    const client = interaction.client as ExtendedClient
    const command = client.commands.get(interaction.commandName)

    if (!command) {
      console.error(`❌ 명령어를 찾을 수 없음: ${interaction.commandName}`)
      await safeReply(interaction, {
        content: '❌ 알 수 없는 명령어입니다.',
        ephemeral: true,
      })
      return
    }

    try {
      console.log(`🔹 명령어 실행: /${interaction.commandName} by ${interaction.user.tag}`)
      await command.execute(interaction)
    } catch (error) {
      console.error(`❌ 명령어 실행 오류 (/${interaction.commandName}):`, error)

      await safeReply(interaction, {
        content: '❌ 명령어 실행 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        ephemeral: true,
      })
    }
  },
}

// 안전한 응답 함수 (이미 응답했는지 확인)
async function safeReply(
  interaction: ChatInputCommandInteraction,
  options: { content: string; ephemeral?: boolean }
): Promise<void> {
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(options)
    } else {
      await interaction.reply(options)
    }
  } catch (error) {
    console.error('응답 전송 실패:', error)
  }
}
