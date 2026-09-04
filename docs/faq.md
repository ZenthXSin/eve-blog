# 十二、FAQ


**Q：插件解析不到 `io.eve.ktannot`？**
A：先执行 `./gradlew :annotations:publishToMavenLocal :buildSrc:publishToMavenLocal`，并在消费项目 `settings.gradle.kts` 的 `pluginManagement.repositories` 加 `mavenLocal()`；`plugins` 块带版本 `id("io.eve.ktannot") version "v159.7.2"`。

**Q：生成代码没出现 / 目录为空？**
A：检查 ① `ktAnnotations.sourceDir` 是否指向真实源码目录（默认 `src/main/kotlin`）；② `build` 是否依赖 `generateKtAnnotations`；③ 生成目录是否已加入 `kotlin.srcDir`。

**Q：编译报 `EntityInterface` 未定义？**
A：`genPackage` 包下需自备 `EntityInterface` 注解声明（见 8.3）。

**Q：`@Remote` 方法没生成 packet？**
A：方法必须放在 `object` 中；`targets` 不能为 `none`；参数只能是原语/String/Player。

**Q：实体里字段重复/被覆盖？**
A：组件间重名字段会被去重（构建日志打印 `Duplicate field`）；跨组件共享字段请在声明处用 `@Import` 表达。

**Q：`kotlin-compiler-embeddable` 警告要紧吗？**
A：不要紧，生成器内部用 PSI 解析需要它（见第九章说明）。

**Q：能像 EntityAnno 一样把自定义组件塞进官方 `Unit` 实体吗？**
A：`v159.7.2` 起可以：字段级 `@EntityDef` 的 `extends` 默认指向 `mindustry.gen.UnitEntity`（也可自定义基类），生成的类直接继承原版实体、可作为 `UnitType` 实体类型，用 `EntityRegistry.content(...)` 绑定（见 [5.8](reference/generated-code.md#_5-8-实体注册-entityregistry-kt)）。代价是此时实体字段/方法来自继承而非组件合并，本地组件的字段仍会合并进子类。

