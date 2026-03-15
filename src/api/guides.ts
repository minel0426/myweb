import request from '@/utils/request'

export interface KnowledgeItem {
  id: string | number;
  title: string;
  desc: string;
  os: string[];
  category: string;
  categoryCode: string;
  content: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface FetchGuidesParams {
  q?: string;
  os?: string;
  categoryCode?: string;
  page?: number;
  pageSize?: number;
}

export interface GuideResponse {
  items: KnowledgeItem[];
  page: number;
  pageSize: number;
  total: number;
}

// 获取故障/指令库列表
export function getGuidesList(params: FetchGuidesParams) {
  return request.get<any, GuideResponse>('/api/guides', { params })
}