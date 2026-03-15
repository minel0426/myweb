import request from '@/utils/request'

// --- 类型定义 (与后端数据结构一致) ---
export interface Project {
  id: number
  title: string
  desc: string
  tag: string
  color: string
  url: string
}

export interface Profile {
  name: string
  avatar: string
  role: string
  bio: string
  location: string
  status: { text: string; online: boolean }
}

export interface Social {
  platform: string
  name: string
  link: string
}

// 首页完整数据结构
export interface HomeData {
  profile: Profile
  socials: Social[]
  techStack: string[]
  projects: Project[]
}

// --- API 方法 ---

// 获取首页数据
export function getHomeData() {
  return request.get<any, HomeData>('/api/home')
}

// 健康检查
export function checkHealth() {
  return request.get('/api/health')
}