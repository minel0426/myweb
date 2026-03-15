<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  generateInvite, getInvites,
  saveGuide, uploadImage, getAdminGuides, deleteGuide,
  type InviteCode, type TroubleGuideDTO
} from '@/api/admin'
import { MdEditor } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'

import { troubleGuidesData } from '@/api/trouble'
import { commandGuidesData } from '@/api/commands'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''
const isDev = import.meta.env.DEV

const isDark = ref(true)
const toggleTheme = () => isDark.value = !isDark.value

const isLoading = ref(false)
const isLoggedIn = ref(false)
const isError = ref(false)

const toast = ref({
  show: false,
  message: '',
  type: 'success' as 'success' | 'error'
})
let toastTimer: number | null = null

const jsonContent = ref('')

const inviteParams = ref({
  maxUses: 1,
  expiresInSec: 600,
  mode: 'messages',
  maxMessages: 20,
  chatTtlSec: 604800
})
const createdInvite = ref<InviteCode | null>(null)
const createLoading = ref(false)

const inviteList = ref<InviteCode[]>([])
const listLoading = ref(false)
const pagination = ref({ page: 1, pageSize: 20, total: 0 })

// --- 🌟 内容管理状态 🌟 ---
const contentList = ref<TroubleGuideDTO[]>([])
const contentLoading = ref(false)
const contentPagination = ref({ page: 1, pageSize: 20, total: 0 })
const filterCategory = ref<'all' | 'trouble' | 'command'>('all')

// --- 发布/编辑表单状态 ---
const guideForm = ref({
  id: '' as string | number,
  category: 'trouble' as 'trouble' | 'command',
  title: '',
  desc: '',
  os: ['windows'] as ('mac' | 'windows' | 'linux')[],
  content: ''
})

const categoryOptions = [
  { value: 'trouble', label: '故障排查', showName: '故障' },
  { value: 'command', label: '指令速查', showName: '指令' }
]

const isGuideSaving = ref(false)
const osOptions = [
  { value: 'windows', label: 'Windows' },
  { value: 'mac', label: 'macOS' },
  { value: 'linux', label: 'Linux' }
]

const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
  if (toastTimer) clearTimeout(toastTimer)
  toast.value = { show: true, message: msg, type }
  toastTimer = setTimeout(() => toast.value.show = false, 3000)
}

const handleLogin = () => {
  window.location.href = `${API_BASE}/api/auth/google/start`
}

const initData = async () => {
  isLoading.value = true
  if (isDev) {
    isLoggedIn.value = true
    jsonContent.value = JSON.stringify({ message: "本地调试模式：已跳过 Google 验证" }, null, 2)
    isLoading.value = false
    return
  }

  try {
    const res = await fetch(`${API_BASE}/api/admin/home`, { credentials: 'include' })
    if (res.status === 401 || res.status === 403) {
      isLoggedIn.value = false
    } else if (res.ok) {
      const data = await res.json()
      isLoggedIn.value = true
      jsonContent.value = JSON.stringify(data.data || {}, null, 2)
    }
  } catch (e) {
    isLoggedIn.value = false
  } finally {
    isLoading.value = false
  }
}

const handleSaveHome = async () => {
  // 保持原有逻辑
  try {
    isLoading.value = true
    let parsedData
    try {
      parsedData = JSON.parse(jsonContent.value)
    } catch (e) {
      showToast('JSON 格式错误，请检查语法', 'error')
      return
    }

    if (isDev) {
      showToast('本地模式：模拟保存 Home 数据成功')
      return
    }

    const res = await fetch(`${API_BASE}/api/admin/home`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(parsedData)
    })
    const json = await res.json()
    if (res.ok && json.code === 200) {
      showToast('首页数据保存成功')
      initData()
    } else {
      showToast(json.message || '保存失败', 'error')
    }
  } catch (err: any) {
    showToast(`保存出错: ${err.message}`, 'error')
  } finally {
    isLoading.value = false
  }
}

const handleGenerate = async () => { /* 保持原有逻辑 */
  if (isDev) { showToast('本地模式：请在线上环境使用此功能', 'error'); return }
  try {
    createLoading.value = true
    createdInvite.value = null
    const params = {
      maxUses: inviteParams.value.maxUses,
      expiresInSec: inviteParams.value.expiresInSec,
      chatPolicy: {
        mode: inviteParams.value.mode,
        maxMessages: inviteParams.value.maxMessages,
        chatTtlSec: inviteParams.value.chatTtlSec
      }
    }
    const data = await generateInvite(params)
    createdInvite.value = data
    showToast('邀请码生成成功')
    fetchInviteList()
  } catch (err: any) {
    showToast(`生成失败: ${err.message}`, 'error')
  } finally {
    createLoading.value = false
  }
}

const fetchInviteList = async () => { /* 保持原有逻辑 */
  listLoading.value = true
  if (isDev) { setTimeout(() => { inviteList.value = []; listLoading.value = false }, 500); return }
  try {
    const res = await getInvites(pagination.value.page, pagination.value.pageSize)
    inviteList.value = res.items || []
    pagination.value.total = res.total || 0
  } catch (e) {
    showToast('获取列表失败', 'error')
  } finally {
    listLoading.value = false
  }
}

const changePage = (delta: number) => {
  const newPage = pagination.value.page + delta
  if (newPage < 1) return
  pagination.value.page = newPage
  fetchInviteList()
}

const handleSizeChange = () => {
  pagination.value.page = 1
  fetchInviteList()
}

const formatDate = (ts?: number) => {
  if (!ts) return '-'
  return new Date(ts).toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const copyText = (text: string) => {
  navigator.clipboard.writeText(text)
  showToast('已复制到剪贴板')
}

// --- 🌟 内容管理相关方法 🌟 ---

// 获取内容列表
const fetchContentList = async () => {
  contentLoading.value = true
  if (isDev) {
    setTimeout(() => {
      let merged = [...troubleGuidesData, ...commandGuidesData]
      if (filterCategory.value !== 'all') {
        merged = merged.filter(item => (item as any).categoryCode === filterCategory.value || (item as any).fileType === filterCategory.value || (item as any).category === (filterCategory.value === 'trouble' ? '故障' : '指令'))
      }
      contentList.value = merged.slice(0, contentPagination.value.pageSize) as TroubleGuideDTO[]
      contentPagination.value.total = merged.length
      contentLoading.value = false
    }, 500)
    return
  }

  try {
    const res = await getAdminGuides(contentPagination.value.page, contentPagination.value.pageSize, filterCategory.value)
    contentList.value = res.items || []
    contentPagination.value.total = res.total || 0
  } catch (e) {
    showToast('获取内容列表失败', 'error')
  } finally {
    contentLoading.value = false
  }
}

const changeContentPage = (delta: number) => {
  const newPage = contentPagination.value.page + delta
  if (newPage < 1) return
  contentPagination.value.page = newPage
  fetchContentList()
}

const handleContentSizeChange = () => {
  contentPagination.value.page = 1
  fetchContentList()
}

const filterContent = (cat: 'all' | 'trouble' | 'command') => {
  filterCategory.value = cat
  contentPagination.value.page = 1
  fetchContentList()
}

// 编辑：数据回填到表单并滚动到底部
const editContent = (item: TroubleGuideDTO) => {
  guideForm.value = {
    id: item.id || '',
    category: (item.categoryCode as 'trouble' | 'command') || 'trouble',
    title: item.title,
    desc: item.desc || '',
    os: item.os || [],
    content: item.content
  }
  showToast('已进入编辑模式')
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
}

// 取消编辑
const cancelEdit = () => {
  guideForm.value = { id: '', category: guideForm.value.category, title: '', desc: '', os: ['windows'], content: '' }
}

// 删除
const handleDeleteGuide = async (id: string | number) => {
  if (!confirm('确定要删除此内容吗？该操作不可恢复！')) return

  if (isDev) {
    showToast('本地模式：模拟删除成功')
    fetchContentList()
    return
  }

  try {
    await deleteGuide(id)
    showToast('删除成功')
    fetchContentList() // 刷新列表
  } catch (e: any) {
    showToast(`删除失败: ${e.message}`, 'error')
  }
}

const toggleOs = (val: 'mac' | 'windows' | 'linux') => {
  const index = guideForm.value.os.indexOf(val)
  if (index > -1) guideForm.value.os.splice(index, 1)
  else guideForm.value.os.push(val)
}

const handleUploadImg = async (files: File[], callback: (urls: string[]) => void) => {
  showToast('正在处理图片...')
  if (isDev) {
    try {
      const urls = await Promise.all(files.map(file => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (e) => resolve(e.target?.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
      }))
      callback(urls)
      showToast('本地调试：图片已转为 Base64 插入')
    } catch (e) {
      showToast('图片转换失败', 'error')
    }
    return
  }

  try {
    const urls = await Promise.all(files.map(async (file) => await uploadImage(file)))
    callback(urls)
    showToast('图片上传成功')
  } catch (error: any) {
    showToast(`图片上传失败: ${error.message}`, 'error')
  }
}

const handleSaveGuide = async () => {
  if (!guideForm.value.title.trim()) return showToast('标题不能为空', 'error')
  if (guideForm.value.os.length === 0) return showToast('请至少选择一个适用环境', 'error')
  if (!guideForm.value.content.trim()) return showToast('内容不能为空', 'error')

  isGuideSaving.value = true

  const selectedCategory = categoryOptions.find(c => c.value === guideForm.value.category)

  const payload: TroubleGuideDTO = {
    title: guideForm.value.title,
    desc: guideForm.value.desc,
    os: [...guideForm.value.os],
    category: selectedCategory?.showName || '未知',
    categoryCode: guideForm.value.category,
    content: guideForm.value.content
  }

  // 如果处于编辑模式，带上 ID
  if (guideForm.value.id) {
    payload.id = guideForm.value.id
  }

  try {
    if (isDev) {
      const guideDataWithId = { ...payload, id: payload.id || Date.now(), fileType: payload.categoryCode }
      const res = await fetch('/__save_guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(guideDataWithId)
      })

      if (!res.ok) throw new Error('本地物理写入失败，请检查终端报错')

      const targetGuide = { ...guideDataWithId }
      delete (targetGuide as any).fileType
      delete (targetGuide as any).categoryCode

      if (guideDataWithId.fileType === 'trouble') {
        troubleGuidesData.unshift(targetGuide as any)
      } else {
        commandGuidesData.unshift(targetGuide as any)
      }
      showToast('[本地模式] 物理保存成功！')

    } else {
      await saveGuide(payload)
      showToast('[线上模式] 保存成功！')
    }

    // 成功后清空表单并刷新列表
    cancelEdit()
    fetchContentList()
  } catch (error: any) {
    console.error(error)
    showToast(error.message || '操作失败', 'error')
  } finally {
    isGuideSaving.value = false
  }
}

onMounted(() => {
  initData()
  fetchInviteList()
  fetchContentList() // 初始化加载内容列表
})
</script>

<template>
  <div class="page-container" :class="{ dark: isDark }">
  
    <Transition name="toast-slide">
      <div v-if="toast.show" class="toast-notification" :class="toast.type">
        <span class="toast-icon">{{ toast.type === 'success' ? 'SUCCESS' : 'ERROR' }}</span>
        {{ toast.message }}
      </div>
    </Transition>
  
    <button class="theme-toggle" @click="toggleTheme">
      <span v-if="isDark">🌙</span>
      <span v-else>☀️</span>
    </button>
  
    <div v-if="!isLoggedIn && !isLoading" class="center-wrapper">
      <div class="bento-card auth-card">
        <div class="card-header">
          <div class="icon-ring">🔑</div>
          <h1>Admin Access</h1>
          <p>Restricted area. Please sign in to verify your identity.</p>
        </div>
        <button class="action-btn" @click="handleLogin">
          Login with Google
        </button>
      </div>
    </div>
  
    <div v-else class="dashboard-wrapper">
  
      <div v-if="isLoading && !jsonContent" class="loading-mask">
        <div class="spinner"></div>
      </div>
  
      <div v-else class="bento-card dashboard-card">
  
        <header class="panel-header">
          <div class="header-title">
            <h2>System Control</h2>
            <span class="badge">ADMIN</span>
          </div>
        </header>
  
        <div class="section">
          <div class="section-top">
            <h3>Home Data</h3>
            <div class="btn-group">
              <button class="ghost-btn" @click="initData">Reset</button>
              <button class="outline-btn" @click="handleSaveHome">Save Changes</button>
            </div>
          </div>
          <div class="editor-wrapper">
            <textarea v-model="jsonContent" spellcheck="false" class="code-editor"></textarea>
          </div>
        </div>
  
        <div class="divider"></div>
  
        <div class="section">
          <h3>Generate Invite</h3>
          <div class="form-grid">
            <div class="form-item">
              <label>Max Uses</label>
              <input type="number" v-model.number="inviteParams.maxUses" min="1" class="zinc-input" />
            </div>
            <div class="form-item">
              <label>Expires (sec)</label>
              <input type="number" v-model.number="inviteParams.expiresInSec" step="60" class="zinc-input" />
            </div>
            <div class="form-item">
              <label>Mode</label>
              <select v-model="inviteParams.mode" class="zinc-input">
                <option value="messages">Messages Limit</option>
                <option value="time">Time Limit</option>
                <option value="forever">Forever</option>
              </select>
            </div>
            <div class="form-item" v-if="inviteParams.mode !== 'time'">
              <label>Max Msgs</label>
              <input type="number" v-model.number="inviteParams.maxMessages" class="zinc-input" />
            </div>
            <div class="form-item action-col">
              <button class="action-btn small" @click="handleGenerate" :disabled="createLoading">
                {{ createLoading ? 'Generating...' : 'Create Key' }}
              </button>
            </div>
          </div>
  
          <div v-if="createdInvite" class="result-box">
            <div class="result-info">
              <span class="label">NEW KEY:</span>
              <code class="key-code" @click="copyText(createdInvite.inviteCode)">{{ createdInvite.inviteCode }}</code>
            </div>
            <button class="copy-link" @click="copyText(createdInvite.inviteCode)">Copy</button>
          </div>
        </div>
  
        <div class="divider"></div>
  
        <div class="section">
          <div class="section-top">
            <h3>Invite History</h3>
            <button class="ghost-btn" @click="fetchInviteList" :disabled="listLoading">Refresh</button>
          </div>
  
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Usage</th>
                  <th>Status</th>
                  <th>Mode</th>
                  <th>Created</th>
                  <th>Expires</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="listLoading && inviteList.length === 0">
                  <td colspan="6" class="text-center">Loading...</td>
                </tr>
                <tr v-else-if="inviteList.length === 0">
                  <td colspan="6" class="text-center">No data found</td>
                </tr>
                <tr v-for="item in inviteList" :key="item.inviteCode">
                  <td>
                    <code class="table-code" @click="copyText(item.inviteCode)">{{ item.inviteCode }}</code>
                  </td>
                  <td>
                    <div class="usage-bar">
                      <span>{{ item.used }}/{{ item.maxUses }}</span>
                      <div class="progress-bg">
                        <div class="progress-fill" :style="{ width: Math.min((item.used/item.maxUses)*100, 100) + '%' }">
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="status-tag" :class="item.status">{{ item.status }}</span>
                  </td>
                  <td class="policy-txt">{{ item.chatPolicy?.mode }}</td>
                  <td class="time-txt">{{ formatDate(item.createdAt) }}</td>
                  <td class="time-txt">{{ formatDate(item.expiresAt) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
  
          <div class="pagination-bar">
            <select v-model="pagination.pageSize" @change="handleSizeChange" class="zinc-select">
              <option :value="10">10 / page</option>
              <option :value="20">20 / page</option>
              <option :value="50">50 / page</option>
            </select>
            <div class="page-controls">
              <button class="icon-btn" :disabled="pagination.page <= 1" @click="changePage(-1)">BACK</button>
              <span class="page-num">{{ pagination.page }}</span>
              <button class="icon-btn" :disabled="pagination.page * pagination.pageSize >= pagination.total"
                @click="changePage(1)">NEXT</button>
            </div>
          </div>
        </div>
  
        <div class="divider"></div>
  
        <div class="section">
          <div class="section-top">
            <h3>Manage Content (内容管理)</h3>
            <div class="btn-group">
              <button :class="filterCategory === 'all' ? 'action-btn small' : 'outline-btn'"
                @click="filterContent('all')">全部</button>
              <button :class="filterCategory === 'trouble' ? 'action-btn small' : 'outline-btn'"
                @click="filterContent('trouble')">故障排查</button>
              <button :class="filterCategory === 'command' ? 'action-btn small' : 'outline-btn'"
                @click="filterContent('command')">指令速查</button>
            </div>
          </div>
  
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>OS</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="contentLoading && contentList.length === 0">
                  <td colspan="5" class="text-center">Loading...</td>
                </tr>
                <tr v-else-if="contentList.length === 0">
                  <td colspan="5" class="text-center">No data found</td>
                </tr>
                <tr v-for="item in contentList" :key="item.id">
                  <td style="font-weight: 500;">{{ item.title }}</td>
                  <td><span class="status-tag active">{{ item.category || '未知' }}</span></td>
                  <td>
                    <span v-for="os in item.os" :key="os"
                      style="margin-right: 4px; font-size: 0.75rem; color: var(--text-secondary);">{{ os }}</span>
                  </td>
                  <td class="time-txt">{{ formatDate(item.createdAt) }}</td>
                  <td>
                    <div class="btn-group" style="gap: 8px;">
                      <button class="ghost-btn" style="padding: 4px; color: var(--text-primary);"
                        @click="editContent(item)">Edit</button>
                      <button class="ghost-btn" style="padding: 4px; color: var(--error-text);"
                        @click="handleDeleteGuide(item.id!)">Delete</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
  
          <div class="pagination-bar">
            <select v-model="contentPagination.pageSize" @change="handleContentSizeChange" class="zinc-select">
              <option :value="10">10 / page</option>
              <option :value="20">20 / page</option>
              <option :value="50">50 / page</option>
            </select>
            <div class="page-controls">
              <button class="icon-btn" :disabled="contentPagination.page <= 1"
                @click="changeContentPage(-1)">BACK</button>
              <span class="page-num">{{ contentPagination.page }}</span>
              <button class="icon-btn"
                :disabled="contentPagination.page * contentPagination.pageSize >= contentPagination.total"
                @click="changeContentPage(1)">NEXT</button>
            </div>
          </div>
        </div>
  
        <div class="divider"></div>
  
        <div class="section">
          <div class="section-top">
            <h3>{{ guideForm.id ? 'Edit Content (编辑内容)' : 'Publish Content (发布内容)' }}</h3>
            <div class="btn-group">
              <button v-if="guideForm.id" class="ghost-btn" @click="cancelEdit">Cancel Edit</button>
              <button class="action-btn small" style="width: auto;" :disabled="isGuideSaving" @click="handleSaveGuide">
                {{ isGuideSaving ? 'Saving...' : (guideForm.id ? 'Save Changes' : 'Publish Content') }}
              </button>
            </div>
          </div>
  
          <div class="form-item" style="margin-bottom: 20px;">
            <label>Category (所属库)</label>
            <div class="btn-group">
              <button v-for="cat in categoryOptions" :key="cat.value"
                :class="guideForm.category === cat.value ? 'action-btn' : 'outline-btn'"
                @click="guideForm.category = (cat.value as any)"
                style="padding: 6px 16px; border-radius: 99px; font-size: 0.8rem;">
                {{ cat.label }}
              </button>
            </div>
          </div>
  
          <div class="form-grid" style="grid-template-columns: 1fr 1fr; margin-bottom: 20px;">
            <div class="form-item">
              <label>Title</label>
              <input v-model="guideForm.title" type="text" class="zinc-input" placeholder="例如：OpenClaw 1008 Error" />
            </div>
            <div class="form-item">
              <label>Description</label>
              <input v-model="guideForm.desc" type="text" class="zinc-input" placeholder="一句话概括内容..." />
            </div>
          </div>
  
          <div class="form-item" style="margin-bottom: 20px;">
            <label>Environment</label>
            <div class="btn-group">
              <button v-for="os in osOptions" :key="os.value"
                :class="guideForm.os.includes(os.value as any) ? 'action-btn' : 'outline-btn'"
                @click="toggleOs(os.value as any)" style="padding: 6px 16px; border-radius: 99px; font-size: 0.8rem;">
                {{ os.label }}
              </button>
            </div>
          </div>
  
          <div class="form-item">
            <label style="margin-bottom: 10px; display: block;">Markdown Content</label>
            <MdEditor v-model="guideForm.content" :theme="isDark ? 'dark' : 'light'" @onUploadImg="handleUploadImg"
              @onSave="handleSaveGuide" class="custom-md-editor" />
          </div>
        </div>
  
      </div>
    </div>
  </div>
</template>

<style scoped src="@/assets/admin.css"></style>

<style scoped>
.custom-md-editor {
  border: 1px solid var(--border-color) !important;
  border-radius: 12px !important;
  overflow: hidden;
  height: 500px;
}

:deep(.md-editor) {
  --md-bk-color: var(--input-bg);
  --md-color: var(--text-primary);
  --md-border-color: var(--border-color);
  --md-border-hover-color: var(--text-secondary);
}

:deep(.md-editor-dark) {
  --md-bk-color: var(--input-bg);
  --md-color: var(--text-primary);
}

:deep(.md-editor-toolbar) {
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-color);
}
</style>