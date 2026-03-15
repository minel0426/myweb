<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { redeemInvite, sendMessage, endSession, type ChatSession } from '@/api/openclaw'

// --- Types ---
interface Message {
  id: number
  role: 'user' | 'assistant' | 'system'
  text: string
  error?: boolean
}

const route = useRoute()
const router = useRouter()

// --- UI & Theme State ---
const isDark = ref(true)
const toggleTheme = () => isDark.value = !isDark.value

// --- Toast State ---
const toast = ref({
  show: false,
  message: '',
  type: 'success' as 'success' | 'error'
})
let toastTimer: number | null = null

const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
  if (toastTimer) clearTimeout(toastTimer)
  toast.value = { show: true, message: msg, type }
  toastTimer = setTimeout(() => { toast.value.show = false }, 3000)
}

// --- Modal State ---
const modal = ref({
  show: false,
  title: '',
  message: '',
  resolve: null as ((val: boolean) => void) | null
})

const askConfirm = (title: string, message: string): Promise<boolean> => {
  modal.value = { show: true, title, message, resolve: null }
  return new Promise((resolve) => {
    modal.value.resolve = resolve
  })
}

const handleModalAction = (confirm: boolean) => {
  modal.value.show = false
  if (modal.value.resolve) modal.value.resolve(confirm)
}

// --- Session State ---
const chatId = ref('')
const currentPolicy = ref<ChatSession['policy']>()
const messages = ref<Message[]>([
  { id: 0, role: 'assistant', text: 'Hello! Please enter your invite code to start.' }
])

// --- Input State ---
const inviteCode = ref('')
const inputText = ref('')
const isLoading = ref(false)
const errorState = ref<'expired' | 'limit' | null>(null)

// --- Core Logic ---

onMounted(() => {
  const queryChatId = route.query.chatId as string
  const queryInvite = route.query.invite as string

  if (queryChatId) enterSession(queryChatId)
  else if (queryInvite) {
    inviteCode.value = queryInvite
    handleRedeem()
  }
})

const enterSession = (id: string, policy?: ChatSession['policy']) => {
  if (!id) return
  chatId.value = id
  currentPolicy.value = policy
  errorState.value = null

  if (messages.value.length === 1 && messages.value[0]?.id === 0) {
    let welcome = 'OpenClaw Link Established.'
    if (policy?.mode === 'messages') {
      welcome += ` (Credits: ${policy.remainingMessages})`
    }
    messages.value = [{ id: Date.now(), role: 'assistant', text: welcome }]
  }
  router.replace({ query: { ...route.query, chatId: id } })
}

const handleRedeem = async () => {
  const code = inviteCode.value.trim()
  if (!code) return
  try {
    isLoading.value = true
    const data = await redeemInvite(code)
    enterSession(data.chatId, data.policy)
    showToast('Connection established')
  } catch (err: any) {
    showToast(err.message || 'Connection failed', 'error')
    if (route.query.invite) router.replace({ query: { ...route.query, invite: undefined } })
  } finally {
    isLoading.value = false
  }
}

const handleSend = async () => {
  const text = inputText.value.trim()
  if (!text || isLoading.value || !chatId.value || errorState.value) return

  messages.value.push({ id: Date.now(), role: 'user', text })
  inputText.value = ''
  scrollToBottom()
  isLoading.value = true

  try {
    const reply = await sendMessage(chatId.value, text)
    messages.value.push({ id: Date.now() + 1, role: 'assistant', text: reply.text })

    if (currentPolicy.value?.mode === 'messages' && currentPolicy.value.remainingMessages) {
      currentPolicy.value.remainingMessages--
    }
  } catch (err: any) {
    const errMsg = err.message
    if (errMsg === 'chat expired') {
      errorState.value = 'expired'
      messages.value.push({ id: Date.now() + 1, role: 'system', text: 'SESSION TERMINATED (EXPIRED)', error: true })
      showToast('Session expired', 'error')
    } else if (errMsg === 'message limit reached') {
      errorState.value = 'limit'
      messages.value.push({ id: Date.now() + 1, role: 'system', text: 'CREDITS EXHAUSTED', error: true })
      showToast('Message limit reached', 'error')
    } else {
      messages.value.push({ id: Date.now() + 1, role: 'system', text: `ERROR: ${errMsg}`, error: true })
      showToast('Failed to send', 'error')
    }
  } finally {
    isLoading.value = false
    scrollToBottom()
  }
}

const handleEnd = async () => {
  const confirmed = await askConfirm('End Session', 'Are you sure you want to disconnect? All context will be lost.')
  if (!confirmed) return

  if (chatId.value) await endSession(chatId.value)
  chatId.value = ''
  inviteCode.value = ''
  currentPolicy.value = undefined
  errorState.value = null
  messages.value = [{ id: 0, role: 'assistant', text: 'Session ended.' }]
  router.replace({ query: { ...route.query, chatId: undefined, invite: undefined } })
  showToast('Disconnected')
}

const copyChatId = () => {
  navigator.clipboard.writeText(chatId.value).then(() => showToast('ID Copied'))
}

const scrollToBottom = () => {
  nextTick(() => {
    const container = document.getElementById('msg-container')
    if (container) container.scrollTop = container.scrollHeight
  })
}
</script>

<template>
  <div class="page-container" :class="{ dark: isDark }">
  
    <Transition name="toast-slide">
      <div v-if="toast.show" class="toast-notification" :class="toast.type">
        <span class="toast-icon">{{ toast.type === 'success' ? 'SUCCESS' : 'ERROR' }}</span>
        {{ toast.message }}
      </div>
    </Transition>
  
    <Transition name="fade">
      <div v-if="modal.show" class="modal-overlay">
        <div class="bento-card modal-card">
          <div class="modal-header">
            <h3>{{ modal.title }}</h3>
          </div>
          <div class="modal-body">
            <p>{{ modal.message }}</p>
          </div>
          <div class="modal-footer">
            <button class="ghost-btn" @click="handleModalAction(false)">Cancel</button>
            <button class="danger-btn" @click="handleModalAction(true)">Confirm</button>
          </div>
        </div>
      </div>
    </Transition>
  
    <button class="theme-toggle" @click="toggleTheme">
      <span v-if="isDark">🌙</span>
      <span v-else>☀️</span>
    </button>
  
    <div v-if="!chatId" class="center-wrapper">
      <div class="bento-card auth-card">
        <div class="card-header">
          <div class="icon-ring">🔑</div>
          <h1>Access Required</h1>
          <p>Enter your invite code to initialize a secure session.</p>
        </div>
        <div class="input-group">
          <input v-model="inviteCode" placeholder="INVITE-CODE-HERE" @keyup.enter="handleRedeem" :disabled="isLoading"
            class="mono-input" />
          <button class="action-btn" @click="handleRedeem" :disabled="!inviteCode || isLoading">
            {{ isLoading ? 'CONNECTING...' : 'CONNECT' }}
          </button>
        </div>
        <div class="card-footer">System secured by OpenClaw</div>
      </div>
    </div>
  
    <div v-else class="chat-wrapper">
      <div class="bento-card chat-card">
        <header class="chat-header">
          <div class="header-left">
            <div class="status-indicator" :class="{ error: errorState }"></div>
            <div class="meta-info">
              <span class="agent-name">OpenClaw Agent</span>
              <span class="session-id" @click="copyChatId">ID: {{ chatId.slice(0, 8) }}...</span>
            </div>
          </div>
          <div class="header-right">
            <span v-if="currentPolicy?.mode === 'messages'" class="policy-badge">{{
              currentPolicy.remainingMessages }} MSGS</span>
            <button class="close-btn" @click="handleEnd">✕</button>
          </div>
        </header>
  
        <div id="msg-container" class="message-list">
          <div v-for="msg in messages" :key="msg.id" class="message-row" :class="msg.role">
            <div class="bubble">
              <span v-if="msg.error" class="warn-icon">!</span>
              {{ msg.text }}
            </div>
          </div>
          <div v-if="isLoading" class="message-row assistant">
            <div class="bubble loading">
              <span class="dot"></span><span class="dot"></span><span class="dot"></span>
            </div>
          </div>
        </div>
  
        <footer class="input-area">
          <input v-model="inputText" type="text" :placeholder="errorState ? 'Connection Closed' : 'Type your command...'"
            :disabled="!!errorState || isLoading" @keyup.enter="handleSend" />
          <button class="send-btn" @click="handleSend" :disabled="!inputText || !!errorState || isLoading">↗</button>
        </footer>
      </div>
    </div>
  </div>
</template>

<style scoped src="@/assets/chat.css"></style>