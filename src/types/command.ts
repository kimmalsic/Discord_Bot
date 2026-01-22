import {
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js'

// 명령어 인터페이스 정의
export interface Command {
  // 명령어 데이터 (Slash Command 빌더)
  data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>

  // 명령어 실행 함수
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>

  // 자동완성 처리 함수 (선택)
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>
}

// 명령어 카테고리 정의
export type CommandCategory =
  | 'project'    // 사업 관리
  | 'milestone'  // 일정 관리
  | 'issue'      // 이슈 관리
  | 'decision'   // 의사결정 관리
  | 'document'   // 문서 관리
  | 'report'     // 요약/리포트

// 명령어 메타데이터
export interface CommandMeta {
  category: CommandCategory
  description: string
  requiredPermission?: 'admin' | 'pm' | 'user'
}
