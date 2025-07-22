// Prompt Template Management System
// AIDEV-NOTE: ChatGPT-4o 평가를 위한 동적 프롬프트 템플릿 관리 시스템

export interface PromptTemplate {
  id: string
  name: string
  template: string
  variables: string[]
  version: string
  isActive: boolean
  createdAt: string
  lastModified: string
  description?: string
}

export class PromptManager {
  private static instance: PromptManager
  private templates: Map<string, PromptTemplate> = new Map()
  
  private constructor() {
    this.registerDefaultPrompts()
  }
  
  public static getInstance(): PromptManager {
    if (!PromptManager.instance) {
      PromptManager.instance = new PromptManager()
    }
    return PromptManager.instance
  }
  
  private registerDefaultPrompts(): void {
    // ChatGPT-4o 평가 프롬프트 등록
    const evaluationPrompt: PromptTemplate = {
      id: 'gpt4o-evaluation',
      name: 'ChatGPT-4o 서술어 평가',
      template: this.getEvaluationTemplate(),
      variables: ['CANDIDATE_ARRAY', 'ORIGINAL_NOUN'],
      version: '1.0.0',
      isActive: true,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      description: '자폐장애인을 위한 의사소통 보조 시스템 - 서술어 후보 평가 및 선별'
    }
    
    this.templates.set(evaluationPrompt.id, evaluationPrompt)
    console.log('📝 [PromptManager] 기본 평가 프롬프트 등록 완료')
  }
  
  private getEvaluationTemplate(): string {
    return `당신은 말을 못하는 자폐장애인(4-7세 지능 수준)을 위한 의사소통 보조 시스템입니다.
다음 json의 text를 평가하여 장애인이 사용할만한 **한국어 문법에 맞는** 자연스럽고 실용적인 문장 후보 15개를 골라주세요.
만약 평가할 문장 개수가 모자란다면 요청한 내용을 기반으로 출력이 15개가 될 수 있도록 문장을 생성하세요. 문장을 생성할 원칙은 입력될 각 문장들의 첫번째 단어를 기준으로, 장애인이 사용할만한 **한국어 문법에 맞는** 자연스럽고 실용적인 문장이어야 합니다.
중복되는 text는 없어야합니다.
category를 확인하고 "요청"이 제일 먼저 나타나야합니다.(가고싶어요, 하고싶어요, 주세요, 도와주세요 등)
그 다음 순서는 category별로 모여야합니다.
category 별로 모일 때 특정 category에 편향되지 않게 주의하세요. 조건을 맞추기 힘들다면 15개보다 적어도 됩니다.

평가 대상 문장 배열:
{{CANDIDATE_ARRAY}}

출력 형식 (JSON):
{
  "predicates": [
    {"text": "자동차를 타고 가요", "emoji": "🚗", "category": "이동"},
    {"text": "자동차가 빨라요", "emoji": "💨", "category": "특성"}
  ]
}`
  }
  
  // 프롬프트 템플릿 보간 (변수 치환)
  public interpolateTemplate(templateId: string, variables: Record<string, any>): string {
    const template = this.templates.get(templateId)
    if (!template) {
      throw new Error(`Template not found: ${templateId}`)
    }
    
    if (!template.isActive) {
      console.warn(`⚠️ [PromptManager] 비활성 템플릿 사용 시도: ${templateId}`)
    }
    
    let interpolated = template.template
    
    // 변수 치환
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
      interpolated = interpolated.replace(new RegExp(placeholder, 'g'), stringValue)
    }
    
    // 미치환 변수 검사
    const unreplacedVars = interpolated.match(/{{[^}]+}}/g)
    if (unreplacedVars) {
      console.warn(`⚠️ [PromptManager] 미치환 변수 발견: ${unreplacedVars.join(', ')}`)
    }
    
    console.log(`📝 [PromptManager] 템플릿 보간 완료: ${templateId}`)
    return interpolated
  }
  
  // 프롬프트 템플릿 업데이트
  public updateTemplate(templateId: string, newTemplate: string, version?: string): void {
    const existing = this.templates.get(templateId)
    if (!existing) {
      throw new Error(`Template not found for update: ${templateId}`)
    }
    
    const updated: PromptTemplate = {
      ...existing,
      template: newTemplate,
      version: version || this.incrementVersion(existing.version),
      lastModified: new Date().toISOString()
    }
    
    this.templates.set(templateId, updated)
    console.log(`📝 [PromptManager] 템플릿 업데이트: ${templateId} (v${updated.version})`)
  }
  
  // 새 프롬프트 템플릿 등록
  public registerTemplate(template: Omit<PromptTemplate, 'createdAt' | 'lastModified'>): void {
    const fullTemplate: PromptTemplate = {
      ...template,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    }
    
    this.templates.set(template.id, fullTemplate)
    console.log(`📝 [PromptManager] 새 템플릿 등록: ${template.id}`)
  }
  
  // 프롬프트 템플릿 조회
  public getTemplate(templateId: string): PromptTemplate | null {
    return this.templates.get(templateId) || null
  }
  
  // 활성 프롬프트 템플릿만 조회
  public getActiveTemplate(templateId: string): PromptTemplate | null {
    const template = this.templates.get(templateId)
    return template?.isActive ? template : null
  }
  
  // 모든 템플릿 목록 조회
  public getAllTemplates(): PromptTemplate[] {
    return Array.from(this.templates.values())
  }
  
  // 템플릿 활성화/비활성화
  public setTemplateActive(templateId: string, isActive: boolean): void {
    const template = this.templates.get(templateId)
    if (!template) {
      throw new Error(`Template not found: ${templateId}`)
    }
    
    template.isActive = isActive
    template.lastModified = new Date().toISOString()
    
    console.log(`📝 [PromptManager] 템플릿 상태 변경: ${templateId} → ${isActive ? '활성' : '비활성'}`)
  }
  
  // 템플릿 삭제
  public deleteTemplate(templateId: string): boolean {
    const deleted = this.templates.delete(templateId)
    if (deleted) {
      console.log(`📝 [PromptManager] 템플릿 삭제: ${templateId}`)
    }
    return deleted
  }
  
  // 프롬프트 기본값 조회 (평가용)
  public getEvaluationPrompt(): string {
    const template = this.getActiveTemplate('gpt4o-evaluation')
    if (!template) {
      throw new Error('평가 프롬프트 템플릿을 찾을 수 없습니다')
    }
    return template.template
  }
  
  // 버전 증가 유틸리티
  private incrementVersion(currentVersion: string): string {
    const parts = currentVersion.split('.')
    const patch = parseInt(parts[2] || '0', 10) + 1
    return `${parts[0] || '1'}.${parts[1] || '0'}.${patch}`
  }
  
  // 템플릿 유효성 검사
  public validateTemplate(template: PromptTemplate): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (!template.id || template.id.trim() === '') {
      errors.push('Template ID is required')
    }
    
    if (!template.template || template.template.trim() === '') {
      errors.push('Template content is required')
    }
    
    if (!template.name || template.name.trim() === '') {
      errors.push('Template name is required')
    }
    
    // 변수 플레이스홀더 검사
    const placeholders = template.template.match(/{{[^}]+}}/g) || []
    const declaredVars = new Set(template.variables)
    const actualVars = new Set(placeholders.map(p => p.replace(/[{}]/g, '')))
    
    // 선언되지 않은 변수 검사
    actualVars.forEach(varName => {
      if (!declaredVars.has(varName)) {
        errors.push(`Undeclared variable: ${varName}`)
      }
    })
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
}

export default PromptManager.getInstance()