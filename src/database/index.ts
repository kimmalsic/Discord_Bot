import { PrismaClient } from '@prisma/client'

// Prisma 클라이언트 싱글톤
// 개발 환경에서 핫 리로드 시 다중 인스턴스 방지

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

export const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'info', 'warn', 'error']
    : ['error'],
})

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}

// 데이터베이스 연결 테스트
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect()
    console.log('✅ 데이터베이스 연결 성공')
  } catch (error) {
    console.error('❌ 데이터베이스 연결 실패:', error)
    throw error
  }
}

// 데이터베이스 연결 해제
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect()
  console.log('📴 데이터베이스 연결 해제')
}
