import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js'
import { projectService } from '../../services'
import { ProjectStatus, ProjectStatusLabels } from '../../types/enums'
import { requirePermission } from '../../utils/permissions'
import { parseDateString } from '../../utils/date'
import {
  createProjectCreatedEmbed,
  createProjectListEmbed,
  createProjectDetailEmbed,
  createProjectStatusChangedEmbed,
  createProjectCompletedEmbed,
} from '../../embeds'
import { Command } from '../../types/command'

// /사업 명령어 정의
const command: Command = {
  data: new SlashCommandBuilder()
    .setName('사업')
    .setDescription('사업(프로젝트) 관리 명령어')
    // /사업 등록
    .addSubcommand(sub =>
      sub
        .setName('등록')
        .setDescription('새 사업을 등록합니다')
        .addStringOption(opt =>
          opt.setName('사업명').setDescription('사업 이름').setRequired(true).setMaxLength(100)
        )
        .addStringOption(opt =>
          opt.setName('시작일').setDescription('시작일 (YYYY-MM-DD)').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('종료일').setDescription('종료일 (YYYY-MM-DD)').setRequired(true)
        )
        .addUserOption(opt =>
          opt.setName('pm').setDescription('담당 PM').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('설명').setDescription('사업 설명').setRequired(false).setMaxLength(1000)
        )
        .addNumberOption(opt =>
          opt.setName('투입공수').setDescription('투입 공수 (M/M)').setRequired(false).setMinValue(0)
        )
        .addStringOption(opt =>
          opt.setName('투입인원').setDescription('투입 인원 정보').setRequired(false).setMaxLength(200)
        )
    )
    // /사업 수정
    .addSubcommand(sub =>
      sub
        .setName('수정')
        .setDescription('사업 정보를 수정합니다')
        .addStringOption(opt =>
          opt.setName('사업명').setDescription('수정할 사업 선택').setRequired(true).setAutocomplete(true)
        )
        .addStringOption(opt =>
          opt.setName('새_사업명').setDescription('새 사업 이름').setRequired(false).setMaxLength(100)
        )
        .addStringOption(opt =>
          opt.setName('시작일').setDescription('시작일 (YYYY-MM-DD)').setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('종료일').setDescription('종료일 (YYYY-MM-DD)').setRequired(false)
        )
        .addUserOption(opt =>
          opt.setName('pm').setDescription('담당 PM').setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('설명').setDescription('사업 설명').setRequired(false).setMaxLength(1000)
        )
        .addNumberOption(opt =>
          opt.setName('투입공수').setDescription('투입 공수 (M/M)').setRequired(false).setMinValue(0)
        )
        .addStringOption(opt =>
          opt.setName('투입인원').setDescription('투입 인원 정보').setRequired(false).setMaxLength(200)
        )
    )
    // /사업 목록
    .addSubcommand(sub =>
      sub
        .setName('목록')
        .setDescription('사업 목록을 조회합니다')
        .addStringOption(opt =>
          opt
            .setName('상태')
            .setDescription('상태 필터')
            .setRequired(false)
            .addChoices(
              { name: '기획중', value: 'PLANNING' },
              { name: '진행중', value: 'IN_PROGRESS' },
              { name: '이슈발생', value: 'ISSUE' },
              { name: '보류', value: 'ON_HOLD' },
              { name: '완료', value: 'COMPLETED' },
            )
        )
        .addUserOption(opt =>
          opt.setName('담당자').setDescription('PM 필터').setRequired(false)
        )
    )
    // /사업 상세
    .addSubcommand(sub =>
      sub
        .setName('상세')
        .setDescription('사업 상세 정보를 조회합니다')
        .addStringOption(opt =>
          opt.setName('사업명').setDescription('사업 선택').setRequired(true).setAutocomplete(true)
        )
    )
    // /사업 상태변경
    .addSubcommand(sub =>
      sub
        .setName('상태변경')
        .setDescription('사업 상태를 변경합니다')
        .addStringOption(opt =>
          opt.setName('사업명').setDescription('사업 선택').setRequired(true).setAutocomplete(true)
        )
        .addStringOption(opt =>
          opt
            .setName('상태')
            .setDescription('변경할 상태')
            .setRequired(true)
            .addChoices(
              { name: '기획중', value: 'PLANNING' },
              { name: '진행중', value: 'IN_PROGRESS' },
              { name: '이슈발생', value: 'ISSUE' },
              { name: '보류', value: 'ON_HOLD' },
            )
        )
    )
    // /사업 종료
    .addSubcommand(sub =>
      sub
        .setName('종료')
        .setDescription('사업을 완료 처리합니다')
        .addStringOption(opt =>
          opt.setName('사업명').setDescription('사업 선택').setRequired(true).setAutocomplete(true)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand()

    switch (subcommand) {
      case '등록':
        await handleCreate(interaction)
        break
      case '수정':
        await handleEdit(interaction)
        break
      case '목록':
        await handleList(interaction)
        break
      case '상세':
        await handleDetail(interaction)
        break
      case '상태변경':
        await handleStatusChange(interaction)
        break
      case '종료':
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

        // 최대 25개까지만 반환 (Discord API 제한)
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

// 사업 등록
async function handleCreate(interaction: ChatInputCommandInteraction): Promise<void> {
  // PM 권한 확인
  if (!(await requirePermission(interaction, 'pm'))) return

  const name = interaction.options.getString('사업명', true)
  const startDateStr = interaction.options.getString('시작일', true)
  const endDateStr = interaction.options.getString('종료일', true)
  const pm = interaction.options.getUser('pm', true)
  const description = interaction.options.getString('설명') ?? undefined
  const manHours = interaction.options.getNumber('투입공수') ?? undefined
  const personnel = interaction.options.getString('투입인원') ?? undefined

  // 날짜 파싱
  const startDate = parseDateString(startDateStr)
  const endDate = parseDateString(endDateStr)

  if (!startDate || !endDate) {
    await interaction.reply({
      content: '❌ 날짜 형식이 올바르지 않습니다. YYYY-MM-DD 형식으로 입력해주세요.',
      ephemeral: true,
    })
    return
  }

  await interaction.deferReply()

  try {
    const project = await projectService.create({
      name,
      description,
      pmDiscordId: pm.id,
      startDate,
      endDate,
      guildId: interaction.guildId!,
      participants: [...new Set([pm.id, interaction.user.id])], // PM과 등록자를 참여자로 추가 (중복 제거)
      manHours,
      personnel,
    })

    const embed = createProjectCreatedEmbed(project)
    await interaction.editReply({ embeds: [embed] })
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    await interaction.editReply({ content: `❌ ${message}` })
  }
}

// 사업 목록 조회
async function handleList(interaction: ChatInputCommandInteraction): Promise<void> {
  const status = interaction.options.getString('상태') as ProjectStatus | null
  const pm = interaction.options.getUser('담당자')

  await interaction.deferReply()

  try {
    const projects = await projectService.findMany({
      guildId: interaction.guildId!,
      status: status ?? undefined,
      pmDiscordId: pm?.id,
    })

    const embed = createProjectListEmbed(projects, interaction.guild?.name)
    await interaction.editReply({ embeds: [embed] })
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    await interaction.editReply({ content: `❌ ${message}` })
  }
}

// 사업 상세 조회
async function handleDetail(interaction: ChatInputCommandInteraction): Promise<void> {
  const projectId = interaction.options.getString('사업명', true)

  await interaction.deferReply()

  try {
    const project = await projectService.getDetail(projectId)

    if (!project) {
      await interaction.editReply({ content: '❌ 사업을 찾을 수 없습니다.' })
      return
    }

    // 서버 확인
    if (project.guildId !== interaction.guildId) {
      await interaction.editReply({ content: '❌ 이 서버의 사업이 아닙니다.' })
      return
    }

    const embed = createProjectDetailEmbed(project)
    await interaction.editReply({ embeds: [embed] })
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    await interaction.editReply({ content: `❌ ${message}` })
  }
}

// 사업 상태 변경
async function handleStatusChange(interaction: ChatInputCommandInteraction): Promise<void> {
  // PM 권한 확인
  if (!(await requirePermission(interaction, 'pm'))) return

  const projectId = interaction.options.getString('사업명', true)
  const newStatus = interaction.options.getString('상태', true) as ProjectStatus

  await interaction.deferReply()

  try {
    const project = await projectService.findById(projectId)

    if (!project) {
      await interaction.editReply({ content: '❌ 사업을 찾을 수 없습니다.' })
      return
    }

    if (project.guildId !== interaction.guildId) {
      await interaction.editReply({ content: '❌ 이 서버의 사업이 아닙니다.' })
      return
    }

    const oldStatus = project.status
    const updatedProject = await projectService.updateStatus(projectId, newStatus)

    const embed = createProjectStatusChangedEmbed(updatedProject, oldStatus, newStatus)
    await interaction.editReply({ embeds: [embed] })
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    await interaction.editReply({ content: `❌ ${message}` })
  }
}

// 사업 종료
async function handleComplete(interaction: ChatInputCommandInteraction): Promise<void> {
  // PM 권한 확인
  if (!(await requirePermission(interaction, 'pm'))) return

  const projectId = interaction.options.getString('사업id', true)

  await interaction.deferReply()

  try {
    const project = await projectService.findById(projectId)

    if (!project) {
      await interaction.editReply({ content: '❌ 사업을 찾을 수 없습니다.' })
      return
    }

    if (project.guildId !== interaction.guildId) {
      await interaction.editReply({ content: '❌ 이 서버의 사업이 아닙니다.' })
      return
    }

    const completedProject = await projectService.complete(projectId)
    const embed = createProjectCompletedEmbed(completedProject)
    await interaction.editReply({ embeds: [embed] })
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    await interaction.editReply({ content: `❌ ${message}` })
  }
}

// 사업 수정
async function handleEdit(interaction: ChatInputCommandInteraction): Promise<void> {
  // PM 권한 확인
  if (!(await requirePermission(interaction, 'pm'))) return

  const projectId = interaction.options.getString('사업명', true)
  const newName = interaction.options.getString('새_사업명') ?? undefined
  const startDateStr = interaction.options.getString('시작일')
  const endDateStr = interaction.options.getString('종료일')
  const pm = interaction.options.getUser('pm')
  const description = interaction.options.getString('설명')
  const manHours = interaction.options.getNumber('투입공수')
  const personnel = interaction.options.getString('투입인원')

  // 변경사항이 없는지 확인
  if (
    !newName &&
    !startDateStr &&
    !endDateStr &&
    !pm &&
    description === null &&
    manHours === null &&
    personnel === null
  ) {
    await interaction.reply({
      content: '❌ 변경할 내용을 입력해주세요.',
      ephemeral: true,
    })
    return
  }

  // 날짜 파싱
  const startDate = startDateStr ? parseDateString(startDateStr) : undefined
  const endDate = endDateStr ? parseDateString(endDateStr) : undefined

  if ((startDateStr && !startDate) || (endDateStr && !endDate)) {
    await interaction.reply({
      content: '❌ 날짜 형식이 올바르지 않습니다. YYYY-MM-DD 형식으로 입력해주세요.',
      ephemeral: true,
    })
    return
  }

  await interaction.deferReply()

  try {
    const project = await projectService.findById(projectId)
    if (!project) {
      await interaction.editReply({ content: '❌ 사업을 찾을 수 없습니다.' })
      return
    }

    if (project.guildId !== interaction.guildId) {
      await interaction.editReply({ content: '❌ 이 서버의 사업이 아닙니다.' })
      return
    }

    const updatedProject = await projectService.update(projectId, {
      name: newName,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      pmDiscordId: pm?.id,
      description: description ?? undefined,
      manHours: manHours ?? undefined,
      personnel: personnel ?? undefined,
    })

    const fullDetail = await projectService.getDetail(updatedProject.id)
    if (fullDetail) {
      const newEmbed = createProjectDetailEmbed(fullDetail)
      await interaction.editReply({ content: '✅ 사업 정보가 수정되었습니다.', embeds: [newEmbed] })
    } else {
      await interaction.editReply({ content: '✅ 사업 정보가 수정되었습니다.' })
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    await interaction.editReply({ content: `❌ ${message}` })
  }
}

export default command
