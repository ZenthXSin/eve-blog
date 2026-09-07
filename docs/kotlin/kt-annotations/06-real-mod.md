# 实战篇：真实 Mindustry mod


> 完整可运行示例见仓库 `realmod/` 模块（v159.7 实机验证通过）。以下按步骤讲解。

### 6.1 工程骨架

```
realmod/
├── build.gradle.kts          # 插件 + mindustryMode + modJar
├── mod.hjson
└── src/main/kotlin/io/eve/
    ├── ktannot/gen/EntityInterface.kt   # gen 包标记注解（必须自备）
    └── realmod/
        ├── RealMod.kt                   # Mod 入口：注册包 + headless 自检
        └── RealModContent.kt            # 全部注解使用示例
```

`build.gradle.kts` 关键点：

```kotlin
plugins {
    id("io.eve.ktannot")
    kotlin("jvm") version "2.2.0"
}
ktAnnotations { mindustryMode = true; genPackage = "io.eve.ktannot.gen" }
dependencies {
    implementation("com.github.Anuken.Mindustry:core:v159.7")   // 引擎核心
    implementation("com.github.Anuken.Arc:arc-core:208a754044") // arc（core 传递依赖同 commit）
    implementation("io.eve.ktannot:annotations:v159.7.2")
}
sourceSets { main { kotlin.srcDir("src/main/kotlin"); kotlin.srcDir("build/generated/ktannot/main/kotlin") } }
```

### 6.2 Mod 入口与注册

```kotlin
class RealMod : Mod() {
    override fun init() {
        io.eve.ktannot.gen.Call.registerPackets()   // 注册 @Remote 生成的包
    }
    override fun loadContent() {
        // @Load 生成物在方块 load() 里调用（headless 无 atlas 需跳过）
    }
}
```

### 6.3 自检模式（headless 服务器）

`realmod` 在 `ServerLoadEvent` 后手动构造 3×3 测试世界（`world.resize + beginMapLoad + tiles.fill + endMapLoad + state.set(playing) + logic.play()`），随后跑 9 项 KTA 自检：Struct 位打包往返、Sync 同步往返、Group instanceof、LogicIO 字符串往返、Remote 包往返、FullUnit 生命周期 + EntityMapping 注册、Building 生命周期、vanilla Unit/SimpleEntity 生命周期。全部通过后 `arc.Core.app.exit()`。

```bash
java -jar server-159.7-release.jar   # config/mods 放 realmod.jar，观察 KTA-* 日志
```

### 6.4 实体与 EntityMapping

生成实体自带 `create()` 工厂（`@JvmStatic`）与统一 `EntityRegistry` 注册入口：

```kotlin
// 方式一：手动注册（更细粒度，控制 key/别名）
val prov = arc.func.Prov { io.eve.ktannot.gen.MyFullUnit() }
EntityMapping.nameMap.put("my-full-unit", prov)
EntityMapping.register("my-full-unit-v2", prov)   // 自定义 id 别名
val u = io.eve.ktannot.gen.MyFullUnit.create()   // 直接构造
u.add(); u.remove()                              // Entityc 生命周期

// 方式二：批量注册所有 @EntityDef 生成实体（按类名作 key）
io.eve.ktannot.gen.EntityRegistry.register()
```

字段级 `@EntityDef`（继承 `mindustry.gen.UnitEntity`）可作为 `UnitType` 实体类型，用 `EntityRegistry.content(name, MyUnitEntity::class.java) { UnitType(it) }` 绑定（见 [5.8](./05-generated-code.md#_5-8-实体注册-entityregistry-kt)）。

### 6.5 打包 mod jar

```kotlin
tasks.register<Jar>("modJar") {
    dependsOn("classes")
    from(sourceSets["main"].output)
    // 合并运行时 classpath（Kotlin stdlib + 注解库），排除引擎已含的 mindustry/arc
    from(configurations.runtimeClasspath.get().map { if (it.isDirectory) it else zipTree(it) }) {
        exclude("META-INF/*.SF", "META-INF/*.DSA", "META-INF/*.RSA", "META-INF/MANIFEST.MF")
        exclude("mindustry/**", "arc/**", "generated/**", "org/jbox2d/**", "com/codex/**")
    }
    from("mod.hjson") { into("/") }
    from("assets") { into("assets") }
    duplicatesStrategy = DuplicatesStrategy.EXCLUDE
}
```

产物 `build/libs/realmod.jar` 直接放入服务器的 `config/mods/`。

### 6.6 完整验证链路（推荐流程）

1. `./gradlew :tests:test` —— stub 单测（纯 JVM，3 项）
2. `./gradlew :realmod:modJar` + headless server 跑 KTA 自检（9 项）
3. `mindustry-mod-validator-full`（OpenGL full 客户端）验证贴图加载、shader 编译、无运行时错误

