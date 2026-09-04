# 八、插件配置参考


### 8.1 `ktAnnotations {}` 扩展

| 属性 | 默认值 | 说明 |
|---|---|---|
| `sourceDir` | `src/main/kotlin` | 扫描的 Kotlin 源码目录（工程目录结构不同时修改，如 `src`） |
| `outputDir` | `build/generated/ktannot/main/kotlin` | 生成代码输出目录 |
| `mindustryMode` | `false` | true 生成对接真实 Mindustry/arc 的代码 |
| `genPackage` | `io.eve.ktannot.gen` | 生成代码的包名 |

### 8.2 任务与自动接线

- 任务：`generateKtAnnotations`（group `kt-annotations`），扫描 → 依次运行 5 个生成器（Entity/Struct/Region/Remote/Logic）→ 输出。
- 插件 `afterEvaluate` 自动：
  - 把 `outputDir` 加入 `main` 的 **java** srcDir；
  - 让 `compileKotlin` 依赖生成目录（`dependsOn(outputDir)`）。
- **不自动做**：把生成目录加入 **kotlin** srcDir（插件刻意不引用 KGP 的 KotlinSourceSet 类型），消费模块需自行：

```kotlin
sourceSets { main { kotlin.srcDir("build/generated/ktannot/main/kotlin") } }
tasks.named("build") { dependsOn("generateKtAnnotations") }
```

### 8.3 `genPackage` 与 `EntityInterface`

生成器会给每个接口/实体加 `@EntityInterface`（引用 `genPackage` 包）。因此消费模块必须在 gen 包下声明它：

```kotlin
// 例：src/main/kotlin/io/eve/ktannot/gen/EntityInterface.kt
package io.eve.ktannot.gen
@Target(AnnotationTarget.CLASS)
@Retention(AnnotationRetention.SOURCE)
annotation class EntityInterface
```

### 8.4 生成器一览

| 生成器 | 消费注解 | 产物 |
|---|---|---|
| `EntityGenerator` | `@Component/@BaseComponent/@EntityDef/@GroupDef/@SyncField/@Import/@ReadOnly` | `*c` 接口、`*Base` 基类、实体类、`IndexableEntity__*` 组接口 |
| `StructGenerator` | `@Struct/@StructField` | 位打包 `object` |
| `RemoteGenerator` | `@Remote` | `*CallPacket` + `Call` |
| `LogicGenerator` | `@RegisterStatement` | `LogicIO` |
| `RegionGenerator` | `@Load` | `ContentRegions` |
| `AssetsGenerator`（已实现未接线） | — | `Tex/Sounds/Musics` 存根 |

