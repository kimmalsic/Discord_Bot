import { EmbedBuilder, Colors } from 'discord.js'

// 주간 리포트 데이터 타입
export interface WeeklyReportData {
  projects: {
    total: number
    active: number
    completed: number
    withIssues: number
  }
  milestones: {
    completed: number
    delayed: number
    upcoming: number
  }
  issues: {
    opened: number
    closed: number
    critical: number
  }
}

// 주간 요약 리포트 Embed
export function createWeeklyReportEmbed(data: WeeklyReportData): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(Colors.Blue)
    .setTitle('📊 주간 사업 현황 리포트')
    .setTimestamp()

  // 사업 현황
  embed.addFields({
    name: '📁 사업 현황',
    value: [
      `전체: **${data.projects.total}**개`,
      `진행중: **${data.projects.active}**개`,
      `완료: **${data.projects.completed}**개`,
      data.projects.withIssues > 0 ? `이슈발생: **${data.projects.withIssues}**개` : null,
    ].filter(Boolean).join(' | '),
    inline: false,
  })

  // 일정 현황
  embed.addFields({
    name: '📅 일정 현황 (이번 주)',
    value: [
      `완료: **${data.milestones.completed}**개`,
      data.milestones.delayed > 0 ? `지연: **${data.milestones.delayed}**개` : '지연: 없음',
      `다음 주 예정: **${data.milestones.upcoming}**개`,
    ].join(' | '),
    inline: false,
  })

  // 이슈 현황
  const issueStatus = data.issues.critical > 0
    ? `🚨 Critical 이슈 **${data.issues.critical}**개 진행 중!`
    : '✅ Critical 이슈 없음'

  embed.addFields({
    name: '🔥 이슈 현황 (이번 주)',
    value: [
      `신규: **${data.issues.opened}**개`,
      `종료: **${data.issues.closed}**개`,
      issueStatus,
    ].join(' | '),
    inline: false,
  })

  // 요약 메시지
  let summaryMessage = ''
  if (data.milestones.delayed > 0 || data.issues.critical > 0) {
    summaryMessage = '⚠️ **주의가 필요한 항목이 있습니다.** 위 현황을 확인해주세요.'
  } else if (data.milestones.completed > 0) {
    summaryMessage = '✅ 이번 주도 순조롭게 진행되고 있습니다!'
  } else {
    summaryMessage = '📌 현재 진행 상황을 확인해주세요.'
  }

  embed.setDescription(summaryMessage)
  embed.setFooter({ text: '매주 월요일 09:00에 자동 발송됩니다' })

  return embed
}

// 전체 요약 Embed (사용자 요청시)
export function createSummaryEmbed(
  guildName: string,
  projects: Array<{
    name: string
    status: string
    progress: number
    openIssues: number
    upcomingMilestones: number
  }>
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(Colors.Blue)
    .setTitle(`📊 사업 현황 요약 - ${guildName}`)
    .setTimestamp()

  if (projects.length === 0) {
    embed.setDescription('진행 중인 사업이 없습니다.')
    return embed
  }

  const projectFields = projects.slice(0, 10).map(p => {
    const statusEmoji = getStatusEmoji(p.status)
    const issueWarning = p.openIssues > 0 ? ` | 🔥 ${p.openIssues}개 이슈` : ''
    const milestoneInfo = p.upcomingMilestones > 0 ? ` | 📅 ${p.upcomingMilestones}개 예정` : ''

    return {
      name: `${statusEmoji} ${p.name}`,
      value: `진행률: ${p.progress}%${issueWarning}${milestoneInfo}`,
      inline: false,
    }
  })

  embed.addFields(projectFields)

  if (projects.length > 10) {
    embed.setFooter({ text: `총 ${projects.length}개 사업 중 10개 표시` })
  } else {
    embed.setFooter({ text: `총 ${projects.length}개 사업` })
  }

  return embed
}

// 상태별 이모지 반환
function getStatusEmoji(status: string): string {
  switch (status) {
    case 'PLANNING': return '📋'
    case 'IN_PROGRESS': return '🚀'
    case 'ISSUE': return '⚠️'
    case 'ON_HOLD': return '⏸️'
    case 'COMPLETED': return '✅'
    default: return '📁'
  }
}
