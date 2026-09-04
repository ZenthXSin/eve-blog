# 注解教程

> `kt-annotations` 是纯 Kotlin 实现的 Mindustry 注解处理器：用注解驱动编译期生成实体组件、网络包、结构体、逻辑语句与贴图加载代码，对标 Mindustry 官方 `mindustry.annotations`（EntityAnno）的 Kotlin 移植。

## 你能用它做什么

- `@Component` 声明实体组件，编译期自动生成 `*c` 接口与实体类
- `@EntityDef` 定义实体，支持字段级继承原版 `UnitEntity` 等基类
- `@Struct` 生成可序列化值类型，`@Remote` 生成跨端网络包
- `@RegisterStatement` 注册自定义逻辑语句，`@Load` 自动加载贴图资源

两种模式：`mindustryMode=true` 生成对接真实引擎的代码；`false` 生成对接内置桩的独立可运行代码（便于纯 JVM 单测）。

## 内容

- [注解参考](./reference.md) —— 全部注解的完整清单与用法（实体体系 / Struct / Remote / Logic / 资源）
- [更新日志](./changelog.md) —— 各版本变更记录

## 快速开始

1. 项目 `settings.gradle.kts` 的 `pluginManagement.repositories` 加 `mavenLocal()`
2. 根 `build.gradle.kts` 应用插件：`id("io.eve.ktannot") version "v159.7.2"`
3. 模块添加依赖：`implementation("io.eve.ktannot:annotations:v159.7.2")`
4. 写第一个 `@Component`，构建后查看生成代码

完整步骤见 [快速开始（学习篇）](../guide/quickstart.md) 与 [实战篇](../guide/real-mod.md)。
