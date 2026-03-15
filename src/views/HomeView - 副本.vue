<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue'
import MainLayout from '../layouts/MainLayout.vue'
import { getHomeData, type HomeData } from '@/api/home'

// --- 状态 ---
const isDark = ref(true)
const isLoading = ref(true)
const errorMsg = ref('')
const homeData = ref<HomeData | null>(null)

// --- 搜索与故障指南状态 ---
const isSearchActive = ref(false)
const searchQuery = ref('')
const selectedOS = ref<'all' | 'mac' | 'windows' | 'linux'>('all')

// 模拟故障指南数据 (后续可抽离到 src/api/guides.ts)
const troubleGuides = ref([
  { id: 1, title: 'Nginx 502 Bad Gateway 排查', desc: '检查反向代理进程状态及端口是否被占用', os: ['linux', 'mac'] },
  { id: 2, title: 'wen7.space 跨域资源共享 (CORS) 失败', desc: '检查后端是否正确配置了 Access-Control-Allow-Origin 头', os: ['linux', 'mac', 'windows'] },
  { id: 3, title: 'Homebrew 环境变量失效', desc: '解决 zshrc 或 bash_profile 中 brew 路径未生效问题', os: ['mac'] },
  { id: 4, title: 'WSL2 内存占用过高导致卡顿', desc: '配置 .wslconfig 限制虚拟机的最大内存使用量', os: ['windows'] },
  { id: 5, title: 'Docker 端口被占用 (Bind failed)', desc: '找出占用目标端口的僵尸进程并 kill 掉', os: ['mac', 'windows', 'linux'] },
])

// --- 方法 ---
const toggleTheme = () => {
  isDark.value = !isDark.value
}

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

// 搜索面板控制
const searchInputRef = ref<HTMLInputElement | null>(null)

const openSearch = async () => {
  isSearchActive.value = true
  // 等待 DOM 更新后，自动聚焦输入框
  await nextTick()
  searchInputRef.value?.focus()
}

const closeSearch = () => {
  isSearchActive.value = false
  setTimeout(() => {
    searchQuery.value = ''
    selectedOS.value = 'all'
  }, 300) // 等待动画结束后清空
}

// 计算搜索结果 (简单的过滤逻辑，后续可换成 fuse.js)
const filteredGuides = computed(() => {
  if (!searchQuery.value && selectedOS.value === 'all') return []

  return troubleGuides.value.filter(guide => {
    const matchOS = selectedOS.value === 'all' || guide.os.includes(selectedOS.value)
    const keyword = searchQuery.value.toLowerCase()
    const matchQuery = guide.title.toLowerCase().includes(keyword) ||
      guide.desc.toLowerCase().includes(keyword)

    return matchOS && (!searchQuery.value || matchQuery)
  })
})

onMounted(() => {
  fetchData()

  // 绑定快捷键
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isSearchActive.value) {
      closeSearch()
    }
    // ⌘ K 或 Ctrl K 唤醒搜索
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault() // 阻止浏览器默认搜索
      isSearchActive.value ? closeSearch() : openSearch()
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
                <div class="search-header">
                    <span class="icon">🔍</span>
                    <input ref="searchInputRef" v-model="searchQuery" type="text" placeholder="输入你遇到的故障或关键字..."
                        autocomplete="off" spellcheck="false" />
                    <button class="close-btn" @click="closeSearch">ESC</button>
                </div>
    
                <div class="os-selector">
                    <button :class="{ active: selectedOS === 'all' }" @click="selectedOS = 'all'">全部环境</button>
                    <button :class="{ active: selectedOS === 'mac' }" @click="selectedOS = 'mac'">macOS</button>
                    <button :class="{ active: selectedOS === 'windows' }" @click="selectedOS = 'windows'">Windows</button>
                    <button :class="{ active: selectedOS === 'linux' }" @click="selectedOS = 'linux'">Linux</button>
                </div>
    
                <div class="search-results">
                    <div v-if="filteredGuides.length === 0 && (searchQuery || selectedOS !== 'all')" class="no-results">
                        没找到相关的指南，要不换个关键词？ 🧐
                    </div>
                    <div v-if="filteredGuides.length === 0 && !searchQuery && selectedOS === 'all'" class="no-results">
                        试着输入点什么，或者选择上方的系统环境。
                    </div>
    
                    <div v-for="item in filteredGuides" :key="item.id" class="result-item">
                        <div class="result-info">
                            <h4>{{ item.title }}</h4>
                            <p>{{ item.desc }}</p>
                        </div>
                        <div class="result-tags">
                            <span v-for="os in item.os" :key="os" class="os-tag">{{ os }}</span>
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
                    <span class="icon">🔍</span>
                    <span class="placeholder">搜索故障指南...</span>
                    <span class="shortcut">⌘ K</span>
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