import { defineConfig } from 'vitepress'
import { withSidebar } from 'vitepress-sidebar'
import type { VitePressSidebarOptions } from 'vitepress-sidebar/types'

function track(name: string): VitePressSidebarOptions {
  return {
    documentRootPath: 'docs',
    scanStartPath: name,
    resolvePath: '/' + name + '/',
    useTitleFromFileHeading: true,
    useFolderTitleFromIndexFile: true,
    useFolderLinkFromIndexFile: true,
    includeEmptyFolder: true,
    includeRootIndexFile: true,
    collapsed: false,
    manualSortFileNameByPriority: ['index.md'],
    excludePattern: ['imgs', 'readme', 'guideline']
  }
}

const viteConfig = defineConfig({
  base: '/eve-blog/',
  title: "Eve's Blog",
  description: 'Eve 的 Mindustry 模组教程：JSON / Java / Kotlin 三轨教程、源码验证的机制结论与踩坑记录',
  lang: 'zh-CN',
  appearance: 'dark',
  lastUpdated: true,
  markdown: {
    lineNumbers: true
  },
  themeConfig: {
    search: {
      provider: 'local'
    },
    nav: [
      { text: 'Json', link: '/json/' },
      { text: 'Java', link: '/java/' },
      { text: 'Kotlin', link: '/kotlin/' },
      { text: '机制与踩坑', link: '/mindustry/' }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/ZenthXSin/eve-blog' }
    ],
    editLink: {
      pattern: 'https://github.com/ZenthXSin/eve-blog/edit/main/docs/:path'
    },
    footer: {
      message: 'MIT License — Copyright (c) 2026 ZXS (ZenthXSin)'
    }
  }
})

export default defineConfig(
  withSidebar(viteConfig, [track('json'), track('java'), track('kotlin'), track('mindustry')])
)