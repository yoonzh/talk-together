// AIDEV-NOTE: 모듈화된 명령어 시스템의 타입 정의
// 자동완성, AI 모델 변경, 도움말 등 모든 설정 명령어에 대한 공통 인터페이스

export interface CommandResult {
  success: boolean
  message?: string
  data?: any
  shouldClearInput?: boolean
  displayDuration?: number
  showHelp?: boolean
}

export interface CommandHandler {
  pattern: RegExp
  name: string
  description: string
  examples: string[]
  execute: (match: RegExpMatchArray, context: CommandContext) => Promise<CommandResult>
}

export interface CommandContext {
  setAutoCompleteConfig: (config: AutoCompleteConfig) => void
  setAiModel: (model: string) => void
  showNotification: (message: string, duration?: number) => void
  showHelp: (visible: boolean) => void
  currentSettings: AppSettings
}

export interface AutoCompleteConfig {
  enabled: boolean
  duration: number // 초 단위
  setAt: number // 설정 시간 타임스탬프
}

export interface AppSettings {
  autoComplete: AutoCompleteConfig
  aiModel: string
  session: {
    id: string
    startTime: number
  }
}

export interface ParsedCommand {
  type: string
  handler: string
  match: RegExpMatchArray
  originalInput: string
}