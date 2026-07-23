/**
 * 菜单图标库（公开页 + 后台菜单管理共享）
 *
 * 数据约定：
 *  - 后端 menu_items.icon 字段存储的 key（kebab-case，如 "github"、"book-open"）
 *  - 前端通过 MENU_ICON_LIST 渲染选择器，通过 getMenuIconSvg(key) 获取 SVG 字符串
 *
 * 维护：
 *  - 新增图标：在 MENU_ICON_MAP 中追加 key → svg 字符串，并在 MENU_ICON_LIST 同步加入
 *  - 所有图标统一使用 16x16 或 24x24 viewBox + currentColor，自适应深浅主题
 */

// key → 完整 SVG 字符串（可直接 v-html 渲染，或用 getMenuIconSvg(key) 取得）
export const MENU_ICON_MAP = {
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l3.18-3.18a5 5 0 0 0-7.07-7.07L11.5 4.5"/><path d="M14 11a5 5 0 0 0-7.07 0L3.75 14.18a5 5 0 0 0 7.07 7.07L12.5 19.5"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17z"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/></svg>',
  'book-open': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 5h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2z"/><path d="M22 5h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z"/></svg>',
  bullhorn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M16 8a4 4 0 0 1 0 8"/><path d="M19 5a8 8 0 0 1 0 14"/></svg>',
  github: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,6 12,13 2,6"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  external: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>'
  // 注：之前的 docker 图标 SVG path 是错的（不是真正的 Docker Logo），已移除。
  //     若历史菜单里存了 icon='docker'，getMenuIconSvg() 会回退到 link 兜底图标，自然兼容。
}

// 供选择器/预览使用的元信息列表（顺序即展示顺序）
export const MENU_ICON_LIST = [
  { key: 'github', label: 'GitHub' },
  { key: 'link', label: '链接' },
  { key: 'home', label: '首页' },
  { key: 'book', label: '文档' },
  { key: 'book-open', label: '介绍' },
  { key: 'bullhorn', label: '推广' },
  { key: 'star', label: '收藏' },
  { key: 'help', label: '帮助' },
  { key: 'mail', label: '邮件' },
  { key: 'chat', label: '聊天' },
  { key: 'settings', label: '设置' },
  { key: 'info', label: '信息' },
  { key: 'external', label: '外链' },
  { key: 'download', label: '下载' }
  // 注：内置 Docker 图标（错误的 SVG）已移除。保留 14 个常用图标，覆盖：
  // 链接/导航/品牌(GitHub)/内容/推广/收藏/帮助/联系/系统/外链/下载等典型菜单场景。
]

/**
 * 根据 key 返回 SVG 字符串。
 *  支持三种取值：
 *  1) 预设 key（与 MENU_ICON_MAP 的 key 对应，如 'github'、'book-open'）
 *  2) 原始 SVG 字符串（以 '<svg' 开头，含 viewBox 的完整 <svg> 片段，用于自定义图标）
 *  3) 空/未匹配 → 返回 link 兜底图标
 *
 * @param {string} key icon 字段值
 * @returns {string} SVG 字符串
 */
export function getMenuIconSvg(key) {
  const k = String(key || '').trim()
  if (!k) return MENU_ICON_MAP.link
  // 自定义原始 SVG：直接返回（前端可 v-html 渲染；公开页/后台统一处理）
  if (k.startsWith('<svg')) return k
  if (MENU_ICON_MAP[k]) return MENU_ICON_MAP[k]
  return MENU_ICON_MAP.link
}

/**
 * 判断一个 icon 值是否原始 SVG 字符串（用于 UI 决定回填到网格选中态还是自定义输入框）。
 * @param {string} key
 * @returns {boolean}
 */
export function isCustomIconSvg(key) {
  return String(key || '').trim().startsWith('<svg')
}
