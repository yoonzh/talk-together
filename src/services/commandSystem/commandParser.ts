// AIDEV-NOTE: 명령어 파싱 시스템 - 사용자 입력을 명령어 패턴과 매칭
// 확장 가능한 구조로 새로운 명령어 패턴을 쉽게 추가할 수 있도록 설계

import type { ParsedCommand } from './types'

export class CommandParser {
  private static readonly COMMAND_PATTERNS = [
    {
      type: 'autoComplete',
      pattern: /^글자완성(\d+)초$/,
      handler: 'autoComplete'
    },
    {
      type: 'aiModel',
      pattern: /^(챗지피티|제미나이|chatgpt|gemini)$/i,
      handler: 'aiModel'
    },
    {
      type: 'help',
      pattern: /^도움말$/,
      handler: 'help'
    }
  ]

  public static parseCommand(input: string): ParsedCommand | null {
    const normalized = input.trim()
    
    for (const cmd of this.COMMAND_PATTERNS) {
      const match = normalized.match(cmd.pattern)
      if (match) {
        return {
          type: cmd.type,
          handler: cmd.handler,
          match,
          originalInput: input
        }
      }
    }
    
    return null
  }

  /**
   * 새로운 명령어 패턴 추가 (향후 확장용)
   */
  public static addCommandPattern(type: string, pattern: RegExp, handler: string): void {
    this.COMMAND_PATTERNS.push({ type, pattern, handler })
  }
}