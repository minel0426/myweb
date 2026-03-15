import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import skipFormatting from 'eslint-config-prettier/flat'

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{vue,ts,mts,tsx}'],
  },

  globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**']),

  ...pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,

  // --- 开始：这里是我们添加的“不严格”规则 ---
  {
    rules: {
      'vue/multi-word-component-names': 'off',     // 允许单个单词组件名 (如 Blog.vue)
      '@typescript-eslint/no-explicit-any': 'off', // 允许使用 any 类型
      '@typescript-eslint/no-unused-vars': 'warn', // 变量定义了没用只警告，不报错
      'no-console': 'off'                          // 允许代码里写 console.log
    }
  },
  // --- 结束 ---

  skipFormatting,
)