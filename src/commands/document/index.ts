import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Colors,
} from 'discord.js'
import { projectService } from '../../services'
import { documentRepository } from '../../repositories'
import { DocumentType } from '../../types/enums'
import { formatRelativeTime } from '../../utils/date'
import { Command } from '../../types/command'

// /문서 명령어 정의
const command: Command = {
  data: new SlashCommandBuilder()
    .setName('문서')
    .setDescription('문서 관리 명령어')
    // /문서 등록
    .addSubcommand(sub =>
      sub
        .setName('등록')
        .setDescription('문서를 등록합니다')
        .addStringOption(opt =>
          opt.setName('사업명').setDescription('사업명 검색').setRequired(true).setAutocomplete(true)
        )
        .addStringOption(opt =>
          opt.setName('문서명').setDescription('문서 이름').setRequired(true).setMaxLength(200)
        )
        .addStringOption(opt =>
          opt.setName('url').setDescription('문서 URL').setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('유형')
            .setDescription('문서 유형')
            .setRequired(true)
            .addChoices(
              { name: '기획서', value: '기획서' },
              { name: '설계서', value: '설계서' },
              { name: '회의록', value: '회의록' },
              { name: '참고자료', value: '참고자료' },
              { name: '계약서', value: '계약서' },
              { name: '보고서', value: '보고서' },
              { name: '기타', value: '기타' },
            )
        )
    )
    // /문서 목록
    .addSubcommand(sub =>
      sub
        .setName('목록')
        .setDescription('문서 목록을 조회합니다')
        .addStringOption(opt =>
          opt.setName('사업명').setDescription('사업명 검색').setRequired(true).setAutocomplete(true)
        )
        .addStringOption(opt =>
          opt
            .setName('유형')
            .setDescription('유형 필터')
            .setRequired(false)
            .addChoices(
              { name: '기획서', value: '기획서' },
              { name: '설계서', value: '설계서' },
              { name: '회의록', value: '회의록' },
              { name: '참고자료', value: '참고자료' },
              { name: '계약서', value: '계약서' },
              { name: '보고서', value: '보고서' },
              { name: '기타', value: '기타' },
            )
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand()

    switch (subcommand) {
      case '등록':
        await handleCreate(interaction)
        break
      case '목록':
        await handleList(interaction)
        break
    }
  },

  async autocomplete(interaction: import('discord.js').AutocompleteInteraction) {
    const focusedOption = interaction.options.getFocused(true)

    // 사업명 자동완성
    if (focusedOption.name === '사업명') {
      const searchTerm = focusedOption.value

      try {
        const projects = await projectService.findMany({
          guildId: interaction.guildId!,
          search: searchTerm,
        })

        const options = projects.slice(0, 25).map(project => ({
          name: project.name,
          value: project.id,
        }))

        await interaction.respond(options)
      } catch (error) {
        console.error('자동완성 처리 중 오류:', error)
        await interaction.respond([])
      }
    }
  },
}

// 문서 등록
async function handleCreate(interaction: ChatInputCommandInteraction): Promise<void> {
  const projectId = interaction.options.getString('사업명', true)
  const name = interaction.options.getString('문서명', true)
  const url = interaction.options.getString('url', true)
  const type = interaction.options.getString('유형', true)

  // URL 유효성 검사
  try {
    new URL(url)
  } catch {
    await interaction.reply({
      content: '❌ 올바른 URL을 입력해주세요.',
      ephemeral: true,
    })
    return
  }

  await interaction.deferReply()

  try {
    // 프로젝트 존재 및 서버 확인
    const project = await projectService.findById(projectId)
    if (!project) {
      await interaction.editReply({ content: '❌ 사업을 찾을 수 없습니다.' })
      return
    }

    if (project.guildId !== interaction.guildId) {
      await interaction.editReply({ content: '❌ 이 서버의 사업이 아닙니다.' })
      return
    }

    const document = await documentRepository.create({
      projectId,
      name,
      type,
      url,
      registrantDiscordId: interaction.user.id,
    })

    const embed = new EmbedBuilder()
      .setColor(Colors.Green)
      .setTitle('✅ 문서가 등록되었습니다')
      .addFields(
        { name: '사업', value: project.name, inline: true },
        { name: '유형', value: document.type, inline: true },
        { name: '문서명', value: document.name, inline: false },
        { name: 'URL', value: document.url, inline: false },
        { name: '등록자', value: `<@${document.registrantDiscordId}>`, inline: true },
      )
      .setFooter({ text: `ID: ${document.id}` })
      .setTimestamp()

    await interaction.editReply({ embeds: [embed] })
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    await interaction.editReply({ content: `❌ ${message}` })
  }
}

// 문서 목록 조회
async function handleList(interaction: ChatInputCommandInteraction): Promise<void> {
  const projectId = interaction.options.getString('사업명', true)
  const type = interaction.options.getString('유형')

  await interaction.deferReply()

  try {
    // 프로젝트 존재 및 서버 확인
    const project = await projectService.findById(projectId)
    if (!project) {
      await interaction.editReply({ content: '❌ 사업을 찾을 수 없습니다.' })
      return
    }

    if (project.guildId !== interaction.guildId) {
      await interaction.editReply({ content: '❌ 이 서버의 사업이 아닙니다.' })
      return
    }

    const documents = await documentRepository.findMany({
      projectId,
      type: type ?? undefined,
    })

    const embed = new EmbedBuilder()
      .setColor(Colors.Blue)
      .setTitle(`📄 문서 목록 - ${project.name}`)
      .setTimestamp()

    if (documents.length === 0) {
      embed.setDescription('등록된 문서가 없습니다.')
    } else {
      // 유형별로 그룹화
      const byType: Record<string, typeof documents> = {}
      for (const doc of documents) {
        if (!byType[doc.type]) {
          byType[doc.type] = []
        }
        byType[doc.type].push(doc)
      }

      const description = Object.entries(byType).map(([docType, docs]) => {
        const docList = docs.map(d => `• [${d.name}](${d.url})`).join('\n')
        return `**${docType}**\n${docList}`
      }).join('\n\n')

      embed.setDescription(description)
      embed.setFooter({ text: `총 ${documents.length}개 문서` })
    }

    await interaction.editReply({ embeds: [embed] })
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    await interaction.editReply({ content: `❌ ${message}` })
  }
}

export default command
