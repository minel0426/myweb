// src/api/openclaw.ts

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

export interface ChatSession {
  chatId: string
  expiresInSec: number
  policy?: {
    mode: 'messages' | 'time' | 'forever'
    remainingMessages?: number
    expiresAt?: number
  }
}

export interface ChatReply {
  type: string
  text: string
}

interface ApiResponse<T> {
  code: number
  data?: T
  message?: string
}

/**
 * 用邀请码兑换 chatId
 * POST /api/openclaw/sessions/by-invite
 */
export async function redeemInvite(inviteCode: string): Promise<ChatSession> {
  const res = await fetch(`${API_BASE}/api/openclaw/sessions/by-invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inviteCode })
  })
  
  const json: ApiResponse<ChatSession> = await res.json()
  
  if (json.code !== 200 || !json.data) {
    throw new Error(json.message || '兑换失败')
  }
  return json.data
}

/**
 * 发送消息
 * POST /api/openclaw/chat
 */
export async function sendMessage(chatId: string, text: string): Promise<ChatReply> {
  const res = await fetch(`${API_BASE}/api/openclaw/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chatId,
      text,
      timeoutMs: 60000 
    })
  })
  
  const json: ApiResponse<{ reply: ChatReply }> = await res.json()
  
  // 特殊处理 410: 过期或次数用尽
  if (json.code === 410) {
    // 将后端具体的 message 抛出，供前端区分显示
    throw new Error(json.message || 'SESSION_EXPIRED')
  }
  
  if (json.code !== 200 || !json.data) {
    throw new Error(json.message || '发送失败')
  }
  
  return json.data.reply
}

/**
 * 结束会话
 */
export async function endSession(chatId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/openclaw/sessions/${chatId}`, {
      method: 'DELETE'
    })
    const json = await res.json()
    return json.code === 200
  } catch (e) {
    console.error('End session failed', e)
    return false
  }
}