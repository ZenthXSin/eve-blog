# kt-annotations

> 纯 Kotlin 实现的 Mindustry 注解处理器：用注解驱动编译期生成实体组件、网络包、结构体、逻辑语句与贴图加载代码。
> 对标 Mindustry 官方 `mindustry.annotations`（EntityAnno）的 Kotlin 移植，**已通过 stub 单测 + v159.7 headless server 实机自检 + full OpenGL 客户端验证**。

- 处理方式：Gradle 插件内嵌 **Kotlin PSI** 扫描器 + **KotlinPoet** 代码生成器，不依赖 javac/kapt，无需注解处理器的 JVM 配置
- 两种模式：`mindustryMode=true` 生成对接真实引擎的代码；`false` 生成对接内置桩的独立可运行代码（便于纯 JVM 单测）
- 版本：插件 `io.eve.ktannot` / 注解库 `io.eve.ktannot:annotations`，`v159.7.2`

## 教程目录

### 指南

- [核心概念](./guide/core-concepts.md) —— 解决什么问题、处理流水线、两种模式
- [环境要求](./guide/environment.md) —— JDK / Gradle / Kotlin / Mindustry 版本基线
- [快速开始（学习篇）](./guide/quickstart.md) —— 发布到本地、接入插件、写第一个注解
- [实战篇：真实 Mindustry mod](./guide/real-mod.md) —— 完整示例模块 `realmod/` 按步骤讲解
- [vanilla 组件库](./guide/vanilla-components.md) —— 44 个对齐原版的 Kotlin 组件

### 参考

- [注解参考](./reference/annotations.md) —— `@Component` / `@EntityDef` / `@Struct` / `@Remote` / `@RegisterStatement` / `@Load`
- [生成代码详解](./reference/generated-code.md) —— 组件接口、实体类、Struct、Remote、Logic、资源、注册入口
- [插件配置参考](./reference/plugin-config.md) —— `ktAnnotations {}` 扩展、任务接线、生成器一览
- [已知限制](./reference/limitations.md) —— 当前版本的 10 项限制与缓解

### 开发与维护

- [项目结构与开发](./dev/project-structure.md) —— 模块划分、常用命令、技术栈
- [验证与测试](./dev/testing.md) —— stub 单测 / headless 实机 / full 客户端三级验证

### 其他

- [FAQ](./faq.md)
- [许可证](./license.md)