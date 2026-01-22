import { GuildSettings } from '@prisma/client'
import { prisma } from '../database'
import { UpdateGuildSettingsDto } from '../types/dto'

// 서버 설정 Repository
export const guildSettingsRepository = {
  // 서버 설정 조회 (없으면 생성)
  async findOrCreate(guildId: string): Promise<GuildSettings> {
    let settings = await prisma.guildSettings.findUnique({
      where: { guildId },
    })

    if (!settings) {
      settings = await prisma.guildSettings.create({
        data: { guildId },
      })
    }

    return settings
  },

  // 서버 설정 조회
  async findByGuildId(guildId: string): Promise<GuildSettings | null> {
    return prisma.guildSettings.findUnique({
      where: { guildId },
    })
  },

  // 서버 설정 업데이트
  async update(guildId: string, data: UpdateGuildSettingsDto): Promise<GuildSettings> {
    return prisma.guildSettings.upsert({
      where: { guildId },
      update: data,
      create: {
        guildId,
        ...data,
      },
    })
  },

  // 알림 채널 설정
  async setNotificationChannel(guildId: string, channelId: string): Promise<GuildSettings> {
    return prisma.guildSettings.upsert({
      where: { guildId },
      update: { notificationChannelId: channelId },
      create: {
        guildId,
        notificationChannelId: channelId,
      },
    })
  },

  // 관리자 역할 설정
  async setAdminRole(guildId: string, roleId: string): Promise<GuildSettings> {
    return prisma.guildSettings.upsert({
      where: { guildId },
      update: { adminRoleId: roleId },
      create: {
        guildId,
        adminRoleId: roleId,
      },
    })
  },

  // PM 역할 설정
  async setPMRole(guildId: string, roleId: string): Promise<GuildSettings> {
    return prisma.guildSettings.upsert({
      where: { guildId },
      update: { pmRoleId: roleId },
      create: {
        guildId,
        pmRoleId: roleId,
      },
    })
  },

  // 시간대 설정
  async setTimezone(guildId: string, timezone: string): Promise<GuildSettings> {
    return prisma.guildSettings.upsert({
      where: { guildId },
      update: { timezone },
      create: {
        guildId,
        timezone,
      },
    })
  },

  // 모든 서버 설정 조회 (스케줄러용)
  async findAll(): Promise<GuildSettings[]> {
    return prisma.guildSettings.findMany()
  },

  // 알림 채널이 설정된 서버 조회
  async findWithNotificationChannel(): Promise<GuildSettings[]> {
    return prisma.guildSettings.findMany({
      where: {
        notificationChannelId: { not: null },
      },
    })
  },
}
