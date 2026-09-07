import { defineConfig } from 'vitepress'

export default defineConfig({
  base: '/eve-blog/',
  title: "Eve's Blog",
  description: 'Eve 的技术博客：Mindustry 模组开发、Kotlin 工程实践与项目文档（kt-annotations）',
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
      { text: '注解', link: '/annotations/' },
      { text: '指南', link: '/guide/core-concepts' },
      { text: '机制', link: '/mindustry/' },
      { text: '项目', link: '/projects/' },
      { text: '参考', link: '/reference/generated-code' },
      { text: '开发', link: '/dev/project-structure' },
      { text: 'FAQ', link: '/faq' }
    ],
    sidebar: {
      '/annotations/': [
        {
          text: '注解教程',
          items: [
            { text: '总览', link: '/annotations/' },
            { text: '注解参考', link: '/annotations/reference' },
            { text: '更新日志', link: '/annotations/changelog' }
          ]
        }
      ],
      '/mindustry/': [
        {
          text: '机制与踩坑',
          items: [
            { text: '总览', link: '/mindustry/' },
            { text: '物品网络传输与接收端不输出', link: '/mindustry/item-network-transport' },
            { text: '高版本 fragBullet 丢失原因', link: '/mindustry/fragbullet-loss' },
            { text: '属性工厂按天气改变效率', link: '/mindustry/weather-attribute-efficiency' },
            { text: '只攻击友军单位的炮塔', link: '/mindustry/friendly-targeting-turret' },
            { text: '编译型 Java mod 特效 JSON 可配置', link: '/mindustry/effect-json-config' },
            { text: '流体噪音效果 Shader 复刻', link: '/mindustry/fluid-shader-replica' },
            { text: 'Tile Shader 世界坐标方案', link: '/mindustry/tile-shader-world-coords' },
            { text: 'Arc Seq 为什么不实现 List', link: '/mindustry/arc-seq-why-not-list' },
            { text: '传送带多方向连接的真相', link: '/mindustry/conveyor-multilink' }
          ]
        }
      ],
      '/projects/': [
        {
          text: '项目',
          items: [
            { text: '总览', link: '/projects/' },
            { text: 'arc-ui-dsl', link: '/projects/arc-ui-dsl' },
            { text: 'kt-annotations', link: '/annotations/' }
          ]
        }
      ],
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