# 快速开始（学习篇）


### 3.1 发布到本地仓库（首次）

```bash
./gradlew :annotations:publishToMavenLocal :buildSrc:publishToMavenLocal
```

产物（`~/.m2/repository/io/eve/ktannot/`）：

| 坐标 | 内容 |
|---|---|
| `io.eve.ktannot:buildSrc:v159.7.2` | 插件实现 |
| `io.eve.ktannot:io.eve.ktannot.gradle.plugin:v159.7.2` | 插件 marker |
| `io.eve.ktannot:annotations:v159.7.2` | 注解库（运行时依赖） |

### 3.2 在消费项目接入

`settings.gradle.kts`：

```kotlin
pluginManagement {
    repositories {
        mavenLocal()            // ← 本地发布后从这里解析插件
        gradlePluginPortal()
        mavenCentral()
        google()
    }
}
```

`build.gradle.kts`：

```kotlin
plugins {
    kotlin("jvm") version "2.2.0"
    id("io.eve.ktannot") version "v159.7.2"
}

ktAnnotations {
    mindustryMode = true        // 生成对接真实 Mindustry 引擎的代码
    genPackage = "my.mod.gen"   // 默认 io.eve.ktannot.gen
}

dependencies {
    implementation("io.eve.ktannot:annotations:v159.7.2")
    // 真实 mod 还需要引擎依赖（见实战篇）
}

// 生成目录加入 Kotlin 源码集（插件只自动加 java srcDir 与任务依赖，Kotlin 目录需手动声明）
sourceSets {
    main {
        kotlin.srcDir("build/generated/ktannot/main/kotlin")
    }
}

tasks.named("build") { dependsOn("generateKtAnnotations") }
```

### 3.3 写第一个注解

```kotlin
package my.mod

import io.eve.ktannot.*

@Component
abstract class PosComp {
    var x: Float = 0f
    var y: Float = 0f
}

@EntityDef([PosComp::class])
abstract class TestUnitDef
```

### 3.4 构建

```bash
./gradlew build
```

生成结果（`build/generated/ktannot/main/kotlin/my/mod/gen/`）：

- `Posc.kt` —— 接口：`public interface Posc { public var x: Float; public var y: Float }`
- `TestUnit.kt` —— 实体类：实现 `Posc` 等接口，字段合并、`serialize()`、组件方法体、`toString()`

```kotlin
val u = my.mod.gen.TestUnit()
u.x = 10f
u.y = 20f
```

