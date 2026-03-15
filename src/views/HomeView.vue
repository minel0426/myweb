<script setup lang="ts">
import { ref, onMounted, computed, nextTick, watch } from 'vue'
import MainLayout from '../layouts/MainLayout.vue'
import { getHomeData, type HomeData } from '@/api/home'
import { getGuidesList, type KnowledgeItem } from '@/api/guides'

import { MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/preview.css'

const getInitialTheme = () => {
  try {
    const saved = localStorage.getItem('theme')
    if (saved !== null) return saved === 'dark'
  } catch (e) { }
  return true
}

const isDark = ref(getInitialTheme())
const isLoading = ref(true)
const errorMsg = ref('')
const homeData = ref<HomeData | null>(null)

const isSearchActive = ref(false)
const searchQuery = ref('')

const guidesList = ref<KnowledgeItem[]>([])
const totalGuides = ref(0)
const guidePage = ref(1)
const guidePageSize = ref(20)
const isLoadingGuides = ref(false)
const guideError = ref('')

const activeGuide = ref<KnowledgeItem | null>(null)
const selectedOS = ref<'all' | 'mac' | 'windows' | 'linux'>('all')
const selectedCategory = ref<'all' | 'trouble' | 'command'>('all')

const toggleTheme = () => {
  isDark.value = !isDark.value
}

watch(isDark, (val) => {
  try {
    localStorage.setItem('theme', val ? 'dark' : 'light')
  } catch (e) { }
  if (typeof document !== 'undefined') {
    document.body.style.backgroundColor = val ? '#09090b' : '#f4f4f5'
    document.body.style.color = val ? '#ffffff' : '#18181b'
    document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease'
    document.documentElement.style.colorScheme = val ? 'dark' : 'light'
  }
}, { immediate: true })

const fetchData = async () => {
  try {
    isLoading.value = true
    errorMsg.value = ''
    const data = await getHomeData()
    homeData.value = data
  } catch (err) {
    console.error(err)
    errorMsg.value = '无法连接到服务器，请检查后端是否运行。'
  } finally {
    isLoading.value = false
  }
}

const loadGuides = async (isLoadMore = false) => {
  try {
    isLoadingGuides.value = true
    guideError.value = ''
    if (!isLoadMore) guidePage.value = 1

    const params: any = {
      page: guidePage.value,
      pageSize: guidePageSize.value
    }

    if (searchQuery.value) params.q = searchQuery.value.trim()
    if (selectedOS.value !== 'all') params.os = selectedOS.value
    if (selectedCategory.value !== 'all') params.categoryCode = selectedCategory.value

    const data = await getGuidesList(params)

    if (isLoadMore) {
      guidesList.value.push(...(data.items || []))
    } else {
      guidesList.value = data.items || []
    }
    totalGuides.value = data.total || 0
  } catch (err) {
    console.error(err)
    guideError.value = '加载内容失败，请稍后重试'
  } finally {
    isLoadingGuides.value = false
  }
}

const loadMore = () => {
  if (guidesList.value.length < totalGuides.value) {
    guidePage.value++
    loadGuides(true)
  }
}

const searchInputRef = ref<HTMLInputElement | null>(null)

const openSearch = async () => {
  isSearchActive.value = true
  await nextTick()
  searchInputRef.value?.focus()
  if (guidesList.value.length === 0) {
    loadGuides()
  }
}

const closeSearch = () => {
  isSearchActive.value = false
  setTimeout(() => {
    searchQuery.value = ''
    selectedOS.value = 'all'
    selectedCategory.value = 'all'
    activeGuide.value = null
  }, 300)
}

const clearSearch = () => {
  searchQuery.value = ''
  nextTick(() => {
    searchInputRef.value?.focus()
  })
}

const viewDetail = (guide: KnowledgeItem) => {
  activeGuide.value = guide
}

const backToList = async () => {
  activeGuide.value = null
  await nextTick()
  searchInputRef.value?.focus()
}

let searchTimeout: any
watch(searchQuery, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    loadGuides()
  }, 500)
})

watch([selectedOS, selectedCategory], () => {
  loadGuides()
})

const displayMarkdown = computed(() => {
  if (!activeGuide.value) return '暂无内容'
  const rawContent = activeGuide.value.content || ''

  if (selectedOS.value === 'all') return rawContent

  const targetOS = selectedOS.value.toLowerCase()
  const lines = rawContent.split('\n')
  const result: string[] = []

  let currentSection = 'common'
  let isCapturing = true

  for (const line of lines) {
    const match = line.match(/^#+\s*(windows|win|mac|macos|linux)/i)

    if (match) {
      const parsedOS = (match[1] || '').toLowerCase()
      if (parsedOS.includes('mac')) currentSection = 'mac'
      else if (parsedOS.includes('win')) currentSection = 'windows'
      else if (parsedOS.includes('lin')) currentSection = 'linux'

      isCapturing = (currentSection === targetOS)

      if (isCapturing) {
        result.push(line)
      }
    } else {
      if (currentSection === 'common' || isCapturing) {
        result.push(line)
      }
    }
  }

  const finalContent = result.join('\n').trim()
  return finalContent.length > 0 ? finalContent : rawContent
})

const highlightText = (text: string, keyword: string) => {
  if (!keyword || !text) return text
  const trimmedKeyword = keyword.trim()
  if (!trimmedKeyword) return text
  const escapedKeyword = trimmedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escapedKeyword})`, 'gi')
  return text.replace(regex, '<span class="highlight-text">$1</span>')
}

onMounted(() => {
  fetchData()

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isSearchActive.value) {
      if (activeGuide.value) {
        backToList()
      } else {
        closeSearch()
      }
    }
  })
})
</script>

<template>
  <MainLayout>
    <Transition name="fade">
      <div v-if="isSearchActive" class="search-overlay" @click="closeSearch"></div>
    </Transition>
  
    <Transition name="big-bang">
      <div v-if="isSearchActive" class="search-modal" :class="{ dark: isDark }">
  
        <div v-if="!activeGuide" class="view-search">
          <div class="search-header">
            <div class="input-wrapper">
              <input ref="searchInputRef" v-model="searchQuery" type="text" placeholder="搜索故障或指令..." autocomplete="off"
                spellcheck="false" />
              <button v-show="searchQuery" class="clear-btn" @click="clearSearch">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"
                  stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <button class="esc-tag" @click="closeSearch">ESC</button>
          </div>
  
          <div class="os-selector filter-category">
            <button :class="{ active: selectedCategory === 'all' }" @click="selectedCategory = 'all'">全部内容</button>
            <button :class="{ active: selectedCategory === 'trouble' }"
              @click="selectedCategory = 'trouble'">故障排查</button>
            <button :class="{ active: selectedCategory === 'command' }"
              @click="selectedCategory = 'command'">指令速查</button>
          </div>
  
          <div class="os-selector">
            <button :class="{ active: selectedOS === 'all' }" @click="selectedOS = 'all'">全部平台</button>
            <button :class="{ active: selectedOS === 'mac' }" @click="selectedOS = 'mac'">macOS</button>
            <button :class="{ active: selectedOS === 'windows' }" @click="selectedOS = 'windows'">Windows</button>
            <button :class="{ active: selectedOS === 'linux' }" @click="selectedOS = 'linux'">Linux</button>
          </div>
  
          <div class="search-results">
            <div v-if="guideError" class="no-results-container">
              <p style="color: #ef4444; margin-bottom: 12px;">{{ guideError }}</p>
              <button class="bento-submit-btn" @click="loadGuides()">点击重试</button>
            </div>
  
            <div v-else-if="isLoadingGuides && guidesList.length === 0" class="no-results-container">
              <p>正在加载内容...</p>
            </div>
  
            <div v-else-if="guidesList.length === 0" class="no-results-container">
              <p v-if="searchQuery || selectedOS !== 'all' || selectedCategory !== 'all'">未找到相关指南</p>
              <p v-else>暂无数据内容</p>
            </div>
  
            <div v-for="item in guidesList" :key="item.id" class="result-item" @click="viewDetail(item)">
              <div class="result-info">
                <h4>
                  <span class="category-badge" :class="item.categoryCode">{{ item.category }}</span>
                  <span v-html="highlightText(item.title, searchQuery)"></span>
                </h4>
                <p v-html="highlightText(item.desc, searchQuery)"></p>
              </div>
              <div class="result-tags">
                <span v-for="os in item.os" :key="os" class="os-tag">{{ os }}</span>
              </div>
            </div>
  
            <div v-if="guidesList.length < totalGuides" class="load-more-container">
              <button class="load-more-btn" @click="loadMore" :disabled="isLoadingGuides">
                {{ isLoadingGuides ? '加载中...' : '加载更多' }}
              </button>
            </div>
          </div>
        </div>
  
        <div v-else class="view-detail">
          <div class="search-header detail-nav">
            <button class="nav-back-btn" @click="backToList">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                style="vertical-align: middle; margin-right: 4px;">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
              返回
            </button>
  
            <div class="os-selector detail-os-selector" v-if="activeGuide.os && activeGuide.os.length > 0">
              <button :class="{ active: selectedOS === 'all' }" @click="selectedOS = 'all'">全部</button>
              <button v-for="os in activeGuide.os" :key="os" :class="{ active: selectedOS === os.toLowerCase() }"
                @click="selectedOS = (os.toLowerCase() as any)">
                {{ os === 'mac' ? 'macOS' : (os === 'windows' ? 'Windows' : 'Linux') }}
              </button>
            </div>
  
            <button class="esc-tag" @click="closeSearch">ESC</button>
          </div>
  
          <div class="detail-scroll-area">
            <h2 class="detail-title">
              <span class="category-badge" style="font-size: 1rem; padding: 4px 8px;">{{ activeGuide.category }}</span>
              {{ activeGuide.title }}
            </h2>
  
            <div class="markdown-render-area">
              <MdPreview :modelValue="displayMarkdown" :theme="isDark ? 'dark' : 'light'" previewTheme="default" />
            </div>
          </div>
        </div>
      </div>
    </Transition>
  
    <div v-if="isLoading" class="status-container">
      <div class="loader">Loading...</div>
    </div>
  
    <div v-else-if="errorMsg" class="status-container error">
      {{ errorMsg }}
      <button @click="fetchData"
        style="margin-top:10px; cursor:pointer; padding: 6px 12px; border-radius: 6px;">重试</button>
    </div>
  
    <div v-else-if="homeData" class="bento-container" :class="{ dark: isDark }">
  
      <div class="search-trigger-container">
        <div class="search-trigger" @click="openSearch">
          <span class="placeholder">搜索指南或指令...</span>
        </div>
      </div>
  
      <button class="theme-toggle" @click="toggleTheme" :title="isDark ? 'Switch to Light' : 'Switch to Dark'">
        <span v-if="isDark">🌙</span>
        <span v-else>☀️</span>
      </button>
  
      <div class="card profile-card">
        <div class="profile-content">
          <div class="avatar-ring">
            <img :src="homeData.profile.avatar" :alt="homeData.profile.name" class="avatar" />
          </div>
          <div class="profile-text">
            <h1>{{ homeData.profile.name }}</h1>
            <p class="role" v-html="homeData.profile.role"></p>
            <p class="bio">{{ homeData.profile.bio }}</p>
          </div>
        </div>
        <div class="status-badge">
          <span class="dot" :class="{ 'online': homeData.profile.status.online }"></span>
          {{ homeData.profile.status.text }}
        </div>
      </div>
  
      <div class="card map-card">
        <div class="map-bg"></div>
        <div class="location-tag">{{ homeData.profile.location }}</div>
      </div>
  
      <a v-for="s in homeData.socials" :key="s.name" :href="s.link" target="_blank" class="card social-card"
        :class="s.platform">
        {{ s.name }} ↗
      </a>
  
      <div class="card stack-card">
        <h3>Tech Stack</h3>
        <div class="stack-icons">
          <span v-for="t in homeData.techStack" :key="t">{{ t }}</span>
        </div>
      </div>
  
      <a v-for="p in homeData.projects" :key="p.id" :href="p.url" target="_blank"
        class="card project-card project-link-wrapper">
        <div class="project-header">
          <span class="project-tag" :style="{ color: p.color, borderColor: p.color }">
            {{ p.tag }}
          </span>
          <div class="arrow-icon">↗</div>
        </div>
        <div class="project-info">
          <h4>{{ p.title }}</h4>
          <p>{{ p.desc }}</p>
        </div>
      </a>
  
    </div>
  </MainLayout>
</template>

<style scoped src="@/assets/home.css"></style>

<style scoped>
.search-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 20px;
}

.input-wrapper {
  position: relative;
  flex: 1;
  min-width: 0;
}

.filter-category {
  border-bottom: none;
  padding-bottom: 6px;
}

.detail-nav {
  border-bottom: 1px solid var(--c-border);
  margin-bottom: 10px;
  justify-content: space-between;
}

.os-selector.detail-os-selector {
  background: transparent;
  padding: 0;
  margin: 0;
  border: none;
  box-shadow: none;
  display: flex;
  gap: 8px;
}

.detail-os-selector button {
  background: var(--c-tag-bg, rgba(0, 0, 0, 0.05));
  border: 1px solid transparent;
  color: var(--c-text-secondary);
  padding: 6px 16px;
  font-size: 0.85rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.detail-os-selector button:hover {
  background: var(--c-hover-bg, rgba(0, 0, 0, 0.1));
}

.detail-os-selector button.active {
  background: var(--c-text-primary);
  color: var(--c-bg-card);
  border-color: var(--c-text-primary);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.category-badge {
  display: inline-block;
  font-size: 0.75rem;
  background: var(--c-text-primary);
  color: var(--c-bg-card);
  padding: 2px 6px;
  border-radius: 6px;
  margin-right: 8px;
  font-weight: normal;
  vertical-align: middle;
}

.detail-title {
  margin-bottom: 24px;
  display: flex;
  align-items: center;
}

.input-wrapper input {
  width: 100%;
  box-sizing: border-box;
  background: var(--c-tag-bg, rgba(0, 0, 0, 0.05));
  border: 1px solid var(--c-border, #eee);
  border-radius: 12px;
  padding: 12px 40px 12px 16px;
  color: var(--c-text-primary);
  font-size: 1rem;
  outline: none;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
}

.input-wrapper input:focus {
  border-color: var(--c-text-primary);
  background: var(--c-bg-card);
}

.clear-btn {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--c-text-muted);
  cursor: pointer;
  display: flex;
  padding: 4px;
  border-radius: 50%;
}

.clear-btn:hover {
  background: rgba(128, 128, 128, 0.1);
  color: var(--c-text-primary);
}

.esc-tag {
  background: var(--c-tag-bg);
  border: 1px solid var(--c-border);
  color: var(--c-text-muted);
  font-size: 0.7rem;
  padding: 4px 8px;
  border-radius: 6px;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
}

.result-item {
  padding: 16px;
  border-radius: 16px;
  margin-bottom: 8px;
  transition: all 0.2s;
  cursor: pointer;
}

.result-item:hover {
  background: var(--c-tag-bg);
}

.no-results-container {
  padding: 40px 0;
  text-align: center;
  color: var(--c-text-muted);
}

.bento-submit-btn {
  margin-top: 16px;
  background: var(--c-text-primary);
  color: var(--c-bg-card);
  border: none;
  padding: 8px 20px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
}

.nav-back-btn {
  background: none;
  border: none;
  color: var(--c-text-secondary);
  font-weight: 600;
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0;
  flex-shrink: 0;
}

.detail-scroll-area {
  padding: 20px 24px;
  overflow-y: auto;
  max-height: 70vh;
}

.load-more-container {
  text-align: center;
  padding: 20px 0;
}

.load-more-btn {
  background: var(--c-tag-bg);
  border: 1px solid var(--c-border);
  color: var(--c-text-primary);
  padding: 8px 24px;
  border-radius: 99px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.load-more-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.load-more-btn:not(:disabled):hover {
  background: var(--c-border);
}

:deep(.md-editor-preview-wrapper) {
  padding: 0;
}

:deep(.md-editor) {
  background-color: transparent !important;
}

:deep(.highlight-text) {
  color: #10b981;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 4px;
}

@media (max-width: 768px) {
  .detail-scroll-area {
    padding: 16px;
  }

  :deep(.os-selector) {
    flex-wrap: wrap !important;
    padding: 10px 16px !important;
    gap: 8px !important;
  }

  :deep(.os-selector button) {
    flex: 1 1 calc(25% - 8px);
    white-space: nowrap;
    padding: 6px 12px !important;
    font-size: 0.8rem !important;
  }

  .search-header {
    padding: 16px 16px 10px 16px !important;
    gap: 10px;
    flex-wrap: nowrap;
  }

  .input-wrapper input {
    font-size: 16px !important;
    padding: 10px 32px 10px 12px;
  }

  .detail-nav {
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
  }

  .os-selector.detail-os-selector {
    flex-wrap: wrap;
    justify-content: flex-start;
    flex: 1 1 100%;
    order: 3;
    padding-top: 10px;
    border-top: 1px dashed var(--c-border);
  }

  .detail-title {
    font-size: 1.2rem;
    line-height: 1.5;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 16px;
  }

  :deep(.md-editor-preview) {
    font-size: 15px !important;
    line-height: 1.6;
    word-break: break-word;
  }

  :deep(.md-editor-copy-button) {
    right: 4px !important;
    top: 4px !important;
    transform: scale(0.8);
  }

  :deep(pre) {
    padding-right: 36px !important;
  }
}
</style>