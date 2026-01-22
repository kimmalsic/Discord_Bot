import { ChatInputCommandInteraction, GuildMember, PermissionFlagsBits, PermissionsBitField } from 'discord.js'
import { prisma } from '../database'

// 권한 레벨 정의
export type PermissionLevel = 'admin' | 'pm' | 'user'

// 권한 체크 결과
export interface PermissionCheckResult {
  allowed: boolean
  reason?: string
  level: PermissionLevel
}

// 사용자 권한 레벨 확인
export async function getUserPermissionLevel(
  interaction: ChatInputCommandInteraction
): Promise<PermissionLevel> {
  const member = interaction.member as GuildMember
  const guildId = interaction.guildId

  if (!member || !guildId) {
    return 'user'
  }

  // Discord 관리자 권한이 있으면 admin
  const permissions =
    typeof member.permissions === 'string'
      ? new PermissionsBitField(BigInt(member.permissions))
      : member.permissions

  if (permissions.has(PermissionFlagsBits.Administrator)) {
    return 'admin'
  }

  // 서버 설정에서 역할 확인
  const settings = await prisma.guildSettings.findUnique({
    where: { guildId },
  })

  if (settings) {
    // Admin 역할 확인
    if (settings.adminRoleId && member.roles.cache.has(settings.adminRoleId)) {
      return 'admin'
    }

    // PM 역할 확인
    if (settings.pmRoleId && member.roles.cache.has(settings.pmRoleId)) {
      return 'pm'
    }
  }

  return 'user'
}

// 권한 레벨 비교 (숫자로 변환)
function getPermissionWeight(level: PermissionLevel): number {
  switch (level) {
    case 'admin': return 3
    case 'pm': return 2
    case 'user': return 1
    default: return 0
  }
}

// 필요한 권한이 있는지 확인
export async function checkPermission(
  interaction: ChatInputCommandInteraction,
  requiredLevel: PermissionLevel
): Promise<PermissionCheckResult> {
  const userLevel = await getUserPermissionLevel(interaction)
  const hasPermission = getPermissionWeight(userLevel) >= getPermissionWeight(requiredLevel)

  if (hasPermission) {
    return {
      allowed: true,
      level: userLevel,
    }
  }

  const levelNames: Record<PermissionLevel, string> = {
    admin: '관리자',
    pm: 'PM',
    user: '일반',
  }

  return {
    allowed: false,
    reason: `이 명령어는 ${levelNames[requiredLevel]} 이상의 권한이 필요합니다.`,
    level: userLevel,
  }
}

// 권한 체크 데코레이터/래퍼
export async function requirePermission(
  interaction: ChatInputCommandInteraction,
  requiredLevel: PermissionLevel
): Promise<boolean> {
  const result = await checkPermission(interaction, requiredLevel)

  if (!result.allowed) {
    await interaction.reply({
      content: `❌ ${result.reason}`,
      ephemeral: true,
    })
    return false
  }

  return true
}

// 사업 PM인지 확인
export async function isProjectPM(
  projectId: string,
  discordId: string
): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  })

  return project?.pmDiscordId === discordId
}

// 사업 참여자인지 확인
export async function isProjectParticipant(
  projectId: string,
  discordId: string
): Promise<boolean> {
  const participant = await prisma.projectParticipant.findUnique({
    where: {
      projectId_discordId: {
        projectId,
        discordId,
      },
    },
  })

  return participant !== null
}
