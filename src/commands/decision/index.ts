import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Colors,
} from 'discord.js'
import { projectService } from '../../services'
import { decisionRepository, parseRelatedLinks } from '../../repositories'
import { requirePermission } from '../../utils/permissions'
import { formatDate, formatRelativeTime } from '../../utils/date'
import { Command } from '../../types/command'

// /결정 명령어 정의
const command: Command = {
  data: new SlashCommandBuilder()
    .setName('결정')
    .setDescription('의사결정 관리 명령어')
    // /결정 기록
    .addSubcommand(sub =>
      sub
        .setName('기록')
        .setDescription('의사결정을 기록합니다')
        .addStringOption(opt =>
          opt.setName('사업id').setDescription('사업 ID').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('내용').setDescription('결정 내용').setRequired(true).setMaxLength(2000)
        )
        .addStringOption(opt =>
          opt.setName('사유').setDescription('결정 사유').setRequired(false).setMaxLength(2000)
        )
        .addStringOption(opt =>
          opt.setName('링크').setDescription('관련 링크 (쉼표로 구분)').setRequired(false)
        )
    )
    // /결정 목록
    .addSubcommand(sub =>
      sub
        .setName('목록')
        .setDescription('의사결정 목록을 조회합니다')
        .addStringOption(opt =>
          opt.setName('사업명').setDescription('사업명 검색').setRequired(true).setAutocomplete(true)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand()

    switch (subcommand) {
      case '기록':
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

// 의사결정 기록
async function handleCreate(interaction: ChatInputCommandInteraction): Promise<void> {
  // PM 권한 확인
  if (!(await requirePermission(interaction, 'pm'))) return

  const projectId = interaction.options.getString('사업명', true)
  const content = interaction.options.getString('내용', true)
  const reason = interaction.options.getString('사유') ?? undefined
  const linksStr = interaction.options.getString('링크')

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

    // 링크 파싱
    const relatedLinks = linksStr
      ? linksStr.split(',').map(l => l.trim()).filter(l => l.length > 0)
      : undefined

    const decision = await decisionRepository.create({
      projectId,
      content,
      reason,
      deciderDiscordId: interaction.user.id,
      relatedLinks,
    })

    const embed = new EmbedBuilder()
      .setColor(Colors.Green)
      .setTitle('✅ 의사결정이 기록되었습니다')
      .addFields(
        { name: '사업', value: project.name, inline: true },
        { name: '결정자', value: `<@${decision.deciderDiscordId}>`, inline: true },
        { name: '결정 내용', value: decision.content, inline: false },
      )
      .setFooter({ text: `ID: ${decision.id}` })
      .setTimestamp()

    if (decision.reason) {
      embed.addFields({ name: '결정 사유', value: decision.reason, inline: false })
    }

    const links = parseRelatedLinks(decision.relatedLinks)
    if (links.length > 0) {
      embed.addFields({
        name: '관련 링크',
        value: links.map(l => `• ${l}`).join('\n'),
        inline: false,
      })
    }

    await interaction.editReply({ embeds: [embed] })
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    await interaction.editReply({ content: `❌ ${message}` })
  }
}

// 의사결정 목록 조회
async function handleList(interaction: ChatInputCommandInteraction): Promise<void> {
  const projectId = interaction.options.getString('사업명', true)

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

    const decisions = await decisionRepository.findByProjectId(projectId)

    const embed = new EmbedBuilder()
      .setColor(Colors.Blue)
      .setTitle(`📝 의사결정 목록 - ${project.name}`)
      .setTimestamp()

    if (decisions.length === 0) {
      embed.setDescription('기록된 의사결정이 없습니다.')
    } else {
      const description = decisions.map((d, idx) => {
        const preview = d.content.length > 100
          ? d.content.substring(0, 100) + '...'
          : d.content
        return `**${idx + 1}. ${formatRelativeTime(d.createdAt)}**\n결정자: <@${d.deciderDiscordId}>\n${preview}`
      }).join('\n\n')

      embed.setDescription(description)
      embed.setFooter({ text: `총 ${decisions.length}개 의사결정` })
    }

    await interaction.editReply({ embeds: [embed] })
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    await interaction.editReply({ content: `❌ ${message}` })
  }
}

export default command
