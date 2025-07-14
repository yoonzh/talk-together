export interface HangulChar {
  initial: string
  medial: string
  final: string
}

export interface CheongjiinInput {
  type: 'initial' | 'medial' | 'final' | 'control'
  value: string
  clickCount?: number
}