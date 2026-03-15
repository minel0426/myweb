import axios, { type AxiosInstance, type AxiosResponse } from 'axios'

// 创建 axios 实例
const service = axios.create({
  // 关键：自动读取 .env.development 中的地址
  baseURL: import.meta.env.VITE_API_BASE_URL, 
  timeout: 10000,
  // 关键：跨域请求必须携带凭证 (Cookie)
  withCredentials: true 
})

// --- 响应拦截器 ---
service.interceptors.response.use(
  (response: AxiosResponse) => {
    // 你的后端约定：{ code: 200, data: {...} }
    const res = response.data
    
    if (res.code === 200) {
      return res.data // 直接返回 data，前端调用时少写一层 .data
    } else {
      // 处理业务错误，比如 code === 401 未登录
      console.error('API Error:', res.message)
      return Promise.reject(new Error(res.message || 'Error'))
    }
  },
  (error: any) => {
    console.error('Network Error:', error)
    return Promise.reject(error)
  }
)

export default service