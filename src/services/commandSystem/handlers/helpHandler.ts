// AIDEV-NOTE: 도움말 표시 명령어 핸들러
// "도움말" 명령어를 처리하여 설정 관련 도움말과 AI 프롬프트를 표시

import type { CommandHandler, CommandContext, CommandResult } from '../types'

export class HelpHandler implements CommandHandler {
  pattern = /^도움말$/
  name = 'help'
  description = '설정 명령어 도움말 표시'
  examples = ['도움말']

  async execute(_match: RegExpMatchArray, context: CommandContext): Promise<CommandResult> {
    // 도움말 표시 활성화
    context.showHelp(true)
    
    console.log('📖 도움말 표시')
    
    return {
      success: true,
      shouldClearInput: true,
      showHelp: true
    }
  }
}