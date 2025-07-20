// AIDEV-NOTE: 메인 CommandSystem 클래스 - 모든 명령어 시스템의 진입점
// 싱글톤 패턴으로 구현하여 전역에서 일관성 있는 명령어 처리 제공

import { CommandParser } from './commandParser'
import { CommandRegistry } from './commandRegistry'
import { AutoCompleteHandler } from './handlers/autoCompleteHandler'
import { AiModelHandler } from './handlers/aiModelHandler'
import { HelpHandler } from './handlers/helpHandler'
import type { CommandContext, CommandResult } from './types'

export class CommandSystem {
  private static instance: CommandSystem
  private registry: CommandRegistry

  private constructor() {
    this.registry = new CommandRegistry()
    this.registerDefaultHandlers()
  }

  public static getInstance(): CommandSystem {
    if (!CommandSystem.instance) {
      CommandSystem.instance = new CommandSystem()
    }
    return CommandSystem.instance
  }

  /**
   * 기본 명령어 핸들러들을 등록
   */
  private registerDefaultHandlers(): void {
    this.registry.register(new AutoCompleteHandler())
    this.registry.register(new AiModelHandler())
    this.registry.register(new HelpHandler())
    
    console.log('🚀 CommandSystem 초기화 완료 - 기본 핸들러 등록됨')
  }

  /**
   * 명령어 실행 메인 메서드
   */
  public async executeCommand(input: string, context: CommandContext): Promise<CommandResult | null> {
    const command = CommandParser.parseCommand(input)
    
    if (!command) {
      return null // 명령어가 아님
    }

    console.log(`🎯 명령어 인식: ${command.type} (${command.originalInput})`)

    const handler = this.registry.getHandler(command.type)
    if (!handler) {
      console.error(`❌ 핸들러를 찾을 수 없음: ${command.type}`)
      return { 
        success: false, 
        message: '⚠️ 알 수 없는 명령어입니다',
        displayDuration: 3000
      }
    }

    try {
      const result = await handler.execute(command.match, context)
      console.log(`✅ 명령어 실행 성공: ${command.type}`, result)
      return result
    } catch (error) {
      console.error(`❌ 명령어 실행 실패: ${command.type}`, error)
      return { 
        success: false, 
        message: '⚠️ 명령어 실행 중 오류가 발생했습니다',
        displayDuration: 3000
      }
    }
  }

  /**
   * 새로운 핸들러 등록 (향후 확장용)
   */
  public registerHandler(handler: any): void {
    this.registry.register(handler)
  }

  /**
   * 등록된 모든 핸들러 조회
   */
  public getAllHandlers(): any[] {
    return this.registry.getAllHandlers()
  }
}

// 싱글톤 인스턴스 export
export default CommandSystem.getInstance()

// 타입들도 함께 export
export * from './types'