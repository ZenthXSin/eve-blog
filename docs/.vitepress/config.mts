import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'kt-annotations',
  description: '纯 Kotlin 实现的 Mindustry 注解处理器：用注解驱动编译期生成实体组件、网络包、结构体、逻辑语句与贴图加载代码',
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
      { text: '指南', link: '/guide/core-concepts' },
      { text: '参考', link: '/reference/annotations' },
      { text: '开发', link: '/dev/project-structure' },
      { text: 'FAQ', link: '/faq' }
    ],
    sidebar: {
      '/guide/': [
        {
          text: '指南',
          items: [
            { text: '核心概念', link: '/guide/core-concepts' },
            { text: '环境要求', link: '/guide/environment' },
            { text: '快速开始（学习篇）', link: '/guide/quickstart' },
            { text: '实战篇：真实 Mindustry mod', link: '/guide/real-mod' },
            { text: 'vanilla 组件库', link: '/guide/vanilla-components' }
          ]
        }
      ],
      '/reference/': [
        {
          text: '参考',
          items: [
            { text: '注解参考', link: '/reference/annotations' },
            { text: '生成代码详解', link: '/reference/generated-code' },
            { text: '插件配置参考', link: '/reference/plugin-config' },
            { text: '已知限制', link: '/reference/limitations' }
          ]
        }
      ],
      '/dev/': [
        {
          text: '开发',
          items: [
            { text: '项目结构与开发', link: '/dev/project-structure' },
            { text: '验证与测试', link: '/dev/testing' }
          ]
        }
      ],
      '/faq': [
        { text: 'FAQ', link: '/faq' },
        { text: '许可证', link: '/license' }
      ]
    },
    footer: {
      message: 'MIT License — Copyright (c) 2026 ZXS (ZenthXSin)'
    }
  }
})