export interface KnowledgeItem {
  id: number | string;
  title: string;
  desc: string;
  os: string[];
  category: string; // 新增字段：用于在列表中显示“故障”、“指令”等标签
  content: string;
}