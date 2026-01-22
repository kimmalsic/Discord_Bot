# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

사업관리 Discord 봇 - Discord 서버에서 사업(프로젝트) 진행 상황을 관리하는 봇.
한국어 Slash Command를 사용하여 사업, 일정, 이슈, 의사결정, 문서를 관리하고 자동 알림 기능을 제공합니다.

## Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.x
- **Discord**: discord.js v14+
- **ORM**: Prisma
- **Database**: SQLite (file:./data/business_bot.db)
- **Validation**: zod
- **Scheduler**: node-cron
- **Date**: date-fns

## Setup

```bash
# 의존성 설치
npm install

# Prisma 클라이언트 생성
npm run db:generate

# 데이터베이스 초기화
npm run db:push

# 개발 실행
npm run dev

# 빌드
npm run build

# 프로덕션 실행
npm start

# 명령어 수동 배포
npm run deploy-commands
```

## Environment Variables

`.env` 파일 생성 필요:

```env
DISCORD_TOKEN=봇_토큰
DISCORD_CLIENT_ID=클라이언트_ID
DISCORD_GUILD_ID=개발_서버_ID (선택, 개발시 사용)
DATABASE_URL=file:./data/business_bot.db
NODE_ENV=development
```

## Architecture

```
src/
├── index.ts              # Entry point
├── client.ts             # Discord client 설정
├── deploy-commands.ts    # 명령어 등록 스크립트
├── config/               # 환경 설정
├── types/                # 타입 정의 (DTO, Enum)
├── database/             # Prisma 클라이언트
├── repositories/         # 데이터 접근 레이어
├── services/             # 비즈니스 로직
├── commands/             # Slash Command 구현
│   ├── project/          # /사업 명령어
│   ├── milestone/        # /일정 명령어
│   ├── issue/            # /이슈 명령어
│   ├── decision/         # /결정 명령어
│   ├── document/         # /문서 명령어
│   └── report/           # /요약 명령어
├── events/               # Discord 이벤트 핸들러
├── schedulers/           # 자동화 스케줄러
├── embeds/               # Discord Embed 빌더
└── utils/                # 유틸리티 (날짜, 권한)
```

## Commands

### Phase 1 (핵심)
- `/사업 등록|목록|상세|상태변경|종료` - 사업 관리
- `/일정 추가|목록|완료` - 마일스톤 관리
- `/이슈 등록|목록|조치|종료` - 이슈 관리

### Phase 2 (확장)
- `/결정 기록|목록` - 의사결정 관리
- `/문서 등록|목록` - 문서 관리
- `/요약` - 전체 현황 요약

## Automated Notifications

- **매일 09:00**: D-7, D-1 일정 알림 및 지연 일정 PM 멘션
- **6시간마다**: 3일 이상 미조치 이슈 경고
- **월요일 09:00**: 주간 요약 리포트
- **즉시**: Critical 이슈 발생시 @here 알림

## Testing

```bash
# 테스트 실행
npm test

# 커버리지 확인
npm test -- --coverage
```

## Database

```bash
# Prisma Studio (데이터 확인)
npm run db:studio

# 마이그레이션 생성
npm run db:migrate
```
