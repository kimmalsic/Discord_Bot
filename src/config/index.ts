import { config as dotenvConfig } from 'dotenv'
import { z } from 'zod'

// .env 파일 로드
dotenvConfig()

// 환경 변수 스키마 정의
const envSchema = z.object({
  // Discord 설정
  DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN이 필요합니다'),
  DISCORD_CLIENT_ID: z.string().min(1, 'DISCORD_CLIENT_ID가 필요합니다'),
  DISCORD_GUILD_ID: z.string().optional(), // 개발용 서버 ID (선택)

  // 데이터베이스 설정
  DATABASE_URL: z.string().min(1, 'DATABASE_URL이 필요합니다'),

  // 환경 설정
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

// 환경 변수 검증
const parseResult = envSchema.safeParse(process.env)

if (!parseResult.success) {
  console.error('❌ 환경 변수 검증 실패:')
  console.error(parseResult.error.format())
  process.exit(1)
}

// 검증된 설정값 내보내기
export const config = {
  discord: {
    token: parseResult.data.DISCORD_TOKEN,
    clientId: parseResult.data.DISCORD_CLIENT_ID,
    guildId: parseResult.data.DISCORD_GUILD_ID,
  },
  database: {
    url: parseResult.data.DATABASE_URL,
  },
  env: parseResult.data.NODE_ENV,
  isDevelopment: parseResult.data.NODE_ENV === 'development',
  isProduction: parseResult.data.NODE_ENV === 'production',
  isTest: parseResult.data.NODE_ENV === 'test',
} as const

export type Config = typeof config
