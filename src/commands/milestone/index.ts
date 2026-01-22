import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from 'discord.js'
import { milestoneService, projectService } from '../../services'
import { MilestoneStatus } from '../../types/enums'
import { requirePermission } from '../../utils/permissions'
import { parseDateString } from '../../utils/date'
import {
  createMilestoneCreatedEmbed,
  createMilestoneListEmbed,
  createMilestoneCompletedEmbed,
} from '../../embeds'
import { Command } from '../../types/command'

// /일정 명령어 정의
const command: Command = {
  data: new SlashCommandBuilder()
    .setName('일정')
    .setDescription('일정(마일스톤) 관리 명령어')
    // /일정 추가
    .addSubcommand(sub =>
      sub
        .setName('추가')
        .setDescription('새 일정을 추가합니다')
        .addStringOption(opt =>
          opt.setName('사업명').setDescription('사업명 검색').setRequired(true).setAutocomplete(true)
        )
        .addStringOption(opt =>
          opt.setName('일정명').setDescription('일정 이름').setRequired(true).setMaxLength(100)
        )
        .addStringOption(opt =>
          opt.setName('목표일').setDescription('목표일 (YYYY-MM-DD)').setRequired(true)
        )
        .addUserOption(opt =>
          opt.setName('담당자').setDescription('담당자').setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('설명').setDescription('일정 설명').setRequired(false).setMaxLength(1000)
        )
    )
    // /일정 목록
    .addSubcommand(sub =>
      sub
        .setName('목록')
        .setDescription('일정 목록을 조회합니다')
        .addStringOption(opt =>
          opt.setName('사업명').setDescription('사업명 검색 (미입력시 전체 조회)').setRequired(false).setAutocomplete(true)
        )
        .addStringOption(opt =>
          opt
            .setName('상태')
            .setDescription('상태 필터')
            .setRequired(false)
            .addChoices(
              { name: '예정', value: 'SCHEDULED' },
              { name: '완료', value: 'COMPLETED' },
              { name: '지연', value: 'DELAYED' },
            )
        )
        .addUserOption(opt =>
          opt.setName('담당자').setDescription('담당자 필터').setRequired(false)
        )
    )
    // /일정 완료
    .addSubcommand(sub =>
      sub
        .setName('완료')
        .setDescription('일정을 완료 처리합니다')
        .addStringOption(opt =>
          opt.setName('일정id').setDescription('일정 ID').setRequired(true)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand()

    switch (subcommand) {
      case '추가':
        await handleCreate(interaction)
        break
      case '목록':
        await handleList(interaction)
        break
      case '완료':
        await handleComplete(interaction)
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

// 일정 추가
async function handleCreate(interaction: ChatInputCommandInteraction): Promise<void> {
  // PM 권한 확인
  if (!(await requirePermission(interaction, 'pm'))) return

  const projectId = interaction.options.getString('사업명', true)
  const name = interaction.options.getString('일정명', true)
  const targetDateStr = interaction.options.getString('목표일', true)
  const assignee = interaction.options.getUser('담당자')
  const description = interaction.options.getString('설명') ?? undefined

  // 날짜 파싱
  const targetDate = parseDateString(targetDateStr)
  if (!targetDate) {
    await interaction.reply({
      content: '❌ 날짜 형식이 올바르지 않습니다. YYYY-MM-DD 형식으로 입력해주세요.',
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

    const milestone = await milestoneService.create({
      projectId,
      name,
      description,
      targetDate,
      assigneeDiscordId: assignee?.id,
    })

    const embed = createMilestoneCreatedEmbed(milestone, project.name)
    await interaction.editReply({ embeds: [embed] })
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    await interaction.editReply({ content: `❌ ${message}` })
  }
}

// 일정 목록 조회
async function handleList(interaction: ChatInputCommandInteraction): Promise<void> {
  const projectId = interaction.options.getString('사업명')
  const status = interaction.options.getString('상태') as MilestoneStatus | null
  const assignee = interaction.options.getUser('담당자')

  await interaction.deferReply()

  try {
    // 사업 ID가 있으면 서버 확인
    let projectName: string | undefined
    if (projectId) {
      const project = await projectService.findById(projectId)
      if (!project) {
        await interaction.editReply({ content: '❌ 사업을 찾을 수 없습니다.' })
        return
      }
      if (project.guildId !== interaction.guildId) {
        await interaction.editReply({ content: '❌ 이 서버의 사업이 아닙니다.' })
        return
      }
      projectName = project.name
    }

    const milestones = await milestoneService.findMany({
      projectId: projectId ?? undefined,
      guildId: projectId ? undefined : interaction.guildId!,
      status: status ?? undefined,
      assigneeDiscordId: assignee?.id,
    })

    const embed = createMilestoneListEmbed(milestones, projectName)
    await interaction.editReply({ embeds: [embed] })
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    await interaction.editReply({ content: `❌ ${message}` })
  }
}

// 일정 완료
async function handleComplete(interaction: ChatInputCommandInteraction): Promise<void> {
  // 일반 사용자도 완료 처리 가능 (담당자)
  const milestoneId = interaction.options.getString('일정id', true)

  await interaction.deferReply()

  try {
    const milestone = await milestoneService.findByIdWithProject(milestoneId)

    if (!milestone) {
      await interaction.editReply({ content: '❌ 일정을 찾을 수 없습니다.' })
      return
    }

    if (milestone.project.guildId !== interaction.guildId) {
      await interaction.editReply({ content: '❌ 이 서버의 일정이 아닙니다.' })
      return
    }

    // 담당자 또는 PM 확인
    const isAssignee = milestone.assigneeDiscordId === interaction.user.id
    const isPM = milestone.project.pmDiscordId === interaction.user.id

    if (!isAssignee && !isPM) {
      // PM 권한 확인
      if (!(await requirePermission(interaction, 'pm'))) {
        await interaction.editReply({
          content: '❌ 일정 담당자 또는 PM만 완료 처리할 수 있습니다.',
        })
        return
      }
    }

    await milestoneService.complete(milestoneId)
    const updated = await milestoneService.findByIdWithProject(milestoneId)

    if (updated) {
      const embed = createMilestoneCompletedEmbed(updated)
      await interaction.editReply({ embeds: [embed] })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    await interaction.editReply({ content: `❌ ${message}` })
  }
}

export default command
