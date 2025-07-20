// AIDEV-NOTE: 명령어 핸들러 등록 및 관리 시스템
// 각 명령어 타입에 대한 핸들러를 등록하고 조회하는 레지스트리

import type { CommandHandler } from './types'

export class CommandRegistry {
  private handlers: Map<string, CommandHandler> = new Map()

  /**
   * 명령어 핸들러 등록
   */
  public register(handler: CommandHandler): void {
    this.handlers.set(handler.name, handler)
    console.log(`📝 명령어 핸들러 등록: ${handler.name}`)
  }

  /**
   * 명령어 핸들러 조회
   */
  public getHandler(name: string): CommandHandler | undefined {
    return this.handlers.get(name)
  }

  /**
   * 등록된 모든 핸들러 목록 조회
   */
  public getAllHandlers(): CommandHandler[] {
    return Array.from(this.handlers.values())
  }

  /**
   * 핸들러 등록 해제
   */
  public unregister(name: string): boolean {
    return this.handlers.delete(name)
  }
}