# 更新日志

kt-annotations 各版本变更记录。仓库：<https://github.com/ZenthXSin/kt-annotations>

## v159.7.2

`2026-09-04` · tag: `v159.7.2`

- **字段级 `@EntityDef` 支持 `extends` 基类**：默认指向 `mindustry.gen.UnitEntity`（也可自定义），生成直接继承原版实体的类，可通过 `EntityRegistry.content(...)` 作为 `UnitType` 实体类型绑定
- **新增 `EntityRegistry`**：统一注册入口，见生成代码详解 [5.8](./05-generated-code.md#_5-8-实体注册-entityregistry-kt)
- **新增 `@EntityComponent` 别名**：等价 `@Component`，对标 EntityAnno 的 `ent.anno.Annotations.EntityComponent`，便于从原版注解迁移
- **`@Load` 支持多维 `lengths`**：多维数组贴图自动加载

## v159.7.1

`2026-08-20` · tag: `v159.7.1`

- **修复**：`@EntityDef` value 数组中的 `*c` 接口名现在会正确解析为对应的 `*Comp` 组件名
- **修复**：`KtClass.name` 改用简单类名而非全限定名，避免 KotlinPoet 对嵌套类报 `Can't escape identifier`

## v159.7.0

`2026-08-19` · tag: `v159.7.0`

- 首个对齐 Mindustry v159.7 的发布版本

## v0.2.0

`2026-08-19` · tag: `v0.2.0`

- **Scanner 解析改进**：从 import 指令解析类型而非硬编码 knownFqn 表；支持泛型类型参数；ThreadLocal 加入 knownFqn
- **Gradle 插件 marker 修复**：`ktannot-gradle-plugin` 以正确 plugin marker 发布
- **vanilla 组件 Phase 6**：Bullet / Player / Unit / Building 等 12+ 组件，共 44 个对齐原版组件
- **README 全面重写**：学习篇 → 实战篇结构，Kotlin 2.2.0 构建对齐
