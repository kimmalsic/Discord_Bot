import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from 'discord.js'
import { issueService, projectService, notificationService } from '../../services'
import { IssueStatus, IssueImpact } from '../../types/enums'
import { requirePermission } from '../../utils/permissions'
import {
  createIssueCreatedEmbed,
  createIssueListEmbed,
  createIssueStatusChangedEmbed,
  createIssueClosedEmbed,
} from '../../embeds'
import { Command } from '../../types/command'
import { ExtendedClient } from '../../client'

// /이슈 명령어 정의
const command: Command = {
  data: new SlashCommandBuilder()
    .setName('이슈')
    .setDescription('이슈 관리 명령어')
    // /이슈 등록
    .addSubcommand(sub =>
      sub
        .setName('등록')
        .setDescription('새 이슈를 등록합니다')
        .addStringOption(opt =>
          opt.setName('사업명').setDescription('사업명 검색').setRequired(true).setAutocomplete(true)
        )
        .addStringOption(opt =>
          opt.setName('제목').setDescription('이슈 제목').setRequired(true).setMaxLength(200)
        )
        .addStringOption(opt =>
          opt.setName('내용').setDescription('이슈 내용').setRequired(true).setMaxLength(2000)
        )
        .addStringOption(opt =>
          opt
            .setName('영향도')
            .setDescription('이슈 영향도')
            .setRequired(true)
            .addChoices(
              { name: '낮음', value: 'LOW' },
              { name: '중간', value: 'MEDIUM' },
              { name: '높음', value: 'HIGH' },
              { name: '심각 (Critical)', value: 'CRITICAL' },
            )
        )
        .addUserOption(opt =>
          opt.setName('담당자').setDescription('담당자').setRequired(false)
        )
    )
    // /이슈 목록
    .addSubcommand(sub =>
      sub
        .setName('목록')
        .setDescription('이슈 목록을 조회합니다')
        .addStringOption(opt =>
          opt.setName('사업명').setDescription('사업명 검색 (미입력시 전체 조회)').setRequired(false).setAutocomplete(true)
        )
        .addStringOption(opt =>
          opt
            .setName('상태')
            .setDescription('상태 필터')
            .setRequired(false)
            .addChoices(
              { name: '등록', value: 'OPEN' },
              { name: '조치중', value: 'IN_ACTION' },
              { name: '해결', value: 'RESOLVED' },
              { name: '종료', value: 'CLOSED' },
            )
        )
        .addStringOption(opt =>
          opt
            .setName('영향도')
            .setDescription('영향도 필터')
            .setRequired(false)
            .addChoices(
              { name: '낮음', value: 'LOW' },
              { name: '중간', value: 'MEDIUM' },
              { name: '높음', value: 'HIGH' },
              { name: '심각 (Critical)', value: 'CRITICAL' },
            )
        )
        .addUserOption(opt =>
          opt.setName('담당자').setDescription('담당자 필터').setRequired(false)
        )
    )
    // /이슈 조치
    .addSubcommand(sub =>
      sub
        .setName('조치')
        .setDescription('이슈 상태를 변경합니다')
        .addStringOption(opt =>
          opt.setName('이슈id').setDescription('이슈 ID').setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('상태')
            .setDescription('변경할 상태')
            .setRequired(true)
            .addChoices(
              { name: '조치중', value: 'IN_ACTION' },
              { name: '해결', value: 'RESOLVED' },
            )
        )
    )
    // /이슈 종료
    .addSubcommand(sub =>
      sub
        .setName('종료')
        .setDescription('이슈를 종료합니다')
        .addStringOption(opt =>
          opt.setName('이슈id').setDescription('이슈 ID').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('조치내용').setDescription('조치 내용 기록').setRequired(false).setMaxLength(2000)
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
      case '조치':
        await handleStatusChange(interaction)
        break
      case '종료':
        await handleClose(interaction)
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

// 이슈 등록
async function handleCreate(interaction: ChatInputCommandInteraction): Promise<void> {
  const projectId = interaction.options.getString('사업명', true)
  const title = interaction.options.getString('제목', true)
  const content = interaction.options.getString('내용', true)
  const impact = interaction.options.getString('영향도', true) as IssueImpact
  const assignee = interaction.options.getUser('담당자')

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

    const issue = await issueService.create({
      projectId,
      title,
      content,
      impact,
      assigneeDiscordId: assignee?.id,
    })

    const embed = createIssueCreatedEmbed(issue, project.name)
    await interaction.editReply({ embeds: [embed] })

    // Critical 이슈인 경우 즉시 알림 발송
    if (issueService.isCritical(impact)) {
      const client = interaction.client as ExtendedClient
      const issueWithProject = await issueService.findByIdWithProject(issue.id)
      if (issueWithProject) {
        await notificationService.sendCriticalIssueNotification(client, issueWithProject)
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    await interaction.editReply({ content: `❌ ${message}` })
  }
}

// 이슈 목록 조회
async function handleList(interaction: ChatInputCommandInteraction): Promise<void> {
  const projectId = interaction.options.getString('사업명')
  const status = interaction.options.getString('상태') as IssueStatus | null
  const impact = interaction.options.getString('영향도') as IssueImpact | null
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

    const issues = await issueService.findMany({
      projectId: projectId ?? undefined,
      guildId: projectId ? undefined : interaction.guildId!,
      status: status ?? undefined,
      impact: impact ?? undefined,
      assigneeDiscordId: assignee?.id,
    })

    const embed = createIssueListEmbed(issues, projectName)
    await interaction.editReply({ embeds: [embed] })
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    await interaction.editReply({ content: `❌ ${message}` })
  }
}

// 이슈 상태 변경
async function handleStatusChange(interaction: ChatInputCommandInteraction): Promise<void> {
  const issueId = interaction.options.getString('이슈id', true)
  const newStatus = interaction.options.getString('상태', true) as IssueStatus

  await interaction.deferReply()

  try {
    const issue = await issueService.findByIdWithProject(issueId)

    if (!issue) {
      await interaction.editReply({ content: '❌ 이슈를 찾을 수 없습니다.' })
      return
    }

    if (issue.project.guildId !== interaction.guildId) {
      await interaction.editReply({ content: '❌ 이 서버의 이슈가 아닙니다.' })
      return
    }

    // 담당자 또는 PM 확인
    const isAssignee = issue.assigneeDiscordId === interaction.user.id
    const isPM = issue.project.pmDiscordId === interaction.user.id

    if (!isAssignee && !isPM) {
      // PM 권한 확인
      if (!(await requirePermission(interaction, 'pm'))) {
        await interaction.editReply({
          content: '❌ 이슈 담당자 또는 PM만 상태를 변경할 수 있습니다.',
        })
        return
      }
    }

    const oldStatus = issue.status
    await issueService.updateStatus(issueId, newStatus)
    const updatedIssue = await issueService.findByIdWithProject(issueId)

    if (updatedIssue) {
      const embed = createIssueStatusChangedEmbed(updatedIssue, oldStatus, newStatus)
      await interaction.editReply({ embeds: [embed] })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    await interaction.editReply({ content: `❌ ${message}` })
  }
}

// 이슈 종료
async function handleClose(interaction: ChatInputCommandInteraction): Promise<void> {
  const issueId = interaction.options.getString('이슈id', true)
  const resolution = interaction.options.getString('조치내용') ?? undefined

  await interaction.deferReply()

  try {
    const issue = await issueService.findByIdWithProject(issueId)

    if (!issue) {
      await interaction.editReply({ content: '❌ 이슈를 찾을 수 없습니다.' })
      return
    }

    if (issue.project.guildId !== interaction.guildId) {
      await interaction.editReply({ content: '❌ 이 서버의 이슈가 아닙니다.' })
      return
    }

    // PM 권한 확인 (이슈 종료는 PM만 가능)
    const isPM = issue.project.pmDiscordId === interaction.user.id
    if (!isPM && !(await requirePermission(interaction, 'pm'))) {
      return
    }

    await issueService.close(issueId, resolution)
    const closedIssue = await issueService.findByIdWithProject(issueId)

    if (closedIssue) {
      const embed = createIssueClosedEmbed(closedIssue)
      await interaction.editReply({ embeds: [embed] })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    await interaction.editReply({ content: `❌ ${message}` })
  }
}

export default command
