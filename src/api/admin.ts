// src/api/admin.ts

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

interface ApiResponse<T> {
  code: number
  data?: T
  message?: string
}

export interface InviteCode {
  inviteCode: string
  maxUses: number
  used: number
  remaining: number
  expiresAt?: number
  createdAt: number
  status: 'active' | 'expired' | 'used_up'
  chatPolicy?: {
    mode: string
    maxMessages?: number
    chatTtlSec?: number
  }
}

export interface InviteListResult {
  items: InviteCode[]
  page: number
  pageSize: number
  total: number
}

interface GenerateInviteParams {
  maxUses: number
  expiresInSec?: number
  chatPolicy: {
    mode: string
    maxMessages: number
    chatTtlSec: number
  }
}

export async function generateInvite(params: GenerateInviteParams): Promise<InviteCode> {
  const res = await fetch(`${API_BASE}/api/admin/invites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(params)
  })

  const json: ApiResponse<InviteCode> = await res.json()
  
  if (json.code !== 200 || !json.data) {
    throw new Error(json.message || '生成邀请码失败')
  }
  
  return json.data
}

export async function getInvites(page = 1, pageSize = 20): Promise<InviteListResult> {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString()
  })

  const res = await fetch(`${API_BASE}/api/admin/invites?${params.toString()}`, {
    method: 'GET',
    credentials: 'include'
  })

  const json: ApiResponse<InviteListResult> = await res.json()

  if (json.code !== 200 || !json.data) {
    throw new Error(json.message || '获取列表失败')
  }

  return json.data
}

// --- 故障指南管理 API ---

export interface TroubleGuideDTO {
  id?: number | string;
  title: string;
  desc: string;
  os: ('mac' | 'windows' | 'linux')[];
  category?: string;
  categoryCode?: string;
  content: string;
  createdAt?: number;
}

export interface GuideListResult {
  items: TroubleGuideDTO[]
  page: number
  pageSize: number
  total: number
}

// 获取内容列表（带分页和分类）
export async function getAdminGuides(page = 1, pageSize = 20, categoryCode?: string): Promise<GuideListResult> {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString()
  })
  if (categoryCode && categoryCode !== 'all') {
    params.append('categoryCode', categoryCode)
  }

  const res = await fetch(`${API_BASE}/api/admin/guides?${params.toString()}`, {
    method: 'GET',
    credentials: 'include'
  })

  const json: ApiResponse<GuideListResult> = await res.json()
  if (json.code !== 200 || !json.data) {
    throw new Error(json.message || '获取内容列表失败')
  }
  return json.data
}

// 删除指南
export async function deleteGuide(id: string | number): Promise<boolean> {
  const res = await fetch(`${API_BASE}/api/admin/guides/${id}`, {
    method: 'DELETE',
    credentials: 'include'
  })

  const json: ApiResponse<null> = await res.json()
  if (json.code !== 200) {
    throw new Error(json.message || '删除失败')
  }
  return true
}

export async function saveGuide(data: TroubleGuideDTO): Promise<TroubleGuideDTO> {
  const isEdit = !!data.id;
  const url = isEdit ? `${API_BASE}/api/admin/guides/${data.id}` : `${API_BASE}/api/admin/guides`;
  
  const res = await fetch(url, {
    method: isEdit ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data)
  });

  const json: ApiResponse<TroubleGuideDTO> = await res.json();
  if (json.code !== 200 || !json.data) {
    throw new Error(json.message || '保存指南失败');
  }
  return json.data;
}

export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/api/admin/upload`, {
    method: 'POST',
    credentials: 'include',
    body: formData
  });

  const json: ApiResponse<{ url: string }> = await res.json();
  if (json.code !== 200 || !json.data) {
    throw new Error(json.message || '图片上传失败');
  }
  return json.data.url;
}