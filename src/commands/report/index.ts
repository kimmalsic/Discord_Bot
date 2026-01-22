import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from 'discord.js'
import { projectService, milestoneService, issueService } from '../../services'
import { createSummaryEmbed } from '../../embeds'
import { ProjectStatus, MilestoneStatus, IssueStatus } from '../../types/enums'
import { Command } from '../../types/command'

// /요약 명령어 정의
const command: Command = {
  data: new SlashCommandBuilder()
    .setName('요약')
    .setDescription('전체 사업 현황을 요약합니다'),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    try {
      const guildId = interaction.guildId!

      // 활성 프로젝트 조회
      const projects = await projectService.findMany({
        guildId,
      })

      // 완료되지 않은 프로젝트만 필터링
      const activeProjects = projects.filter(
        p => p.status !== ProjectStatus.COMPLETED
      )

      // 각 프로젝트의 상세 정보 조회
      const projectSummaries = await Promise.all(
        activeProjects.slice(0, 10).map(async project => {
          const detail = await projectService.getDetail(project.id)
          if (!detail) return null

          return {
            name: project.name,
            status: project.status,
            progress: detail.stats.progress,
            openIssues: detail.stats.issues.open,
            upcomingMilestones: detail.milestones.filter(
              m => m.status === MilestoneStatus.SCHEDULED
            ).length,
          }
        })
      )

      const validSummaries = projectSummaries.filter(
        (s): s is NonNullable<typeof s> => s !== null
      )

      const embed = createSummaryEmbed(
        interaction.guild?.name || '서버',
        validSummaries
      )

      await interaction.editReply({ embeds: [embed] })
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      await interaction.editReply({ content: `❌ ${message}` })
    }
  },
}

export default command
