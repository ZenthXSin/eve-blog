# 环境搭建：JDK、依赖与两种构建方式

> 作者：Eve.aic · 本页两种构建方式都实际跑通过（产物均经 mindustry-mod-validator-full 验证，错误 0）
> 基线：原版 Mindustry v159.7

Java mod 的"环境"其实就三件事：一个 JDK、一份 Mindustry 的类（用来编译）、一条把 class 打成 jar 的命令。依赖管理可以用 Gradle，也可以完全不用——两种都给你，按需选。

## JDK

官方构建脚本把兼容级别定死在 **Java 17**：

```groovy
tasks.withType(JavaCompile){
    targetCompatibility = JavaVersion.VERSION_17
    sourceCompatibility = JavaVersion.VERSION_17
}
```

Source: build.gradle:196-199（Mindustry 仓库根 build.gradle）

所以装 JDK 17（或更高，编译目标仍设为 17）就行。检查一下：

```bash
javac -version    # 期望 javac 17.x
```

## 方式 A：Gradle + JitPack（推荐）

### 项目结构

```
javamod-gradle/
├── build.gradle
├── settings.gradle
├── gradle.properties        # 可选：代理、内存
├── mod.json                 # 会被打进 jar 根目录
└── src/
    └── gradledemo/
        └── GradleDemoMod.java
```

### build.gradle

```groovy
plugins {
    id 'java'
}

version = '1.0.0'
sourceCompatibility = JavaVersion.VERSION_17
targetCompatibility = JavaVersion.VERSION_17

// 教程里直接把包目录放在 src/ 下，不用标准的 src/main/java
sourceSets {
    main {
        java {
            srcDirs = ['src']
        }
    }
}

repositories {
    mavenCentral()
    maven { url 'https://jitpack.io' }
}

dependencies {
    // 关键：compileOnly。Mindustry 由游戏自己提供，不能打进 jar
    compileOnly 'com.github.Anuken.Mindustry:core:v159.7'
    compileOnly 'com.github.Anuken.Arc:arc-core:v159.7'
}

jar {
    archiveFileName = 'java-gradle-demo.jar'
    duplicatesStrategy = DuplicatesStrategy.EXCLUDE
    // 把 mod.json 一并打进 jar 根目录，省一次手工步骤
    from('mod.json') {
        into ''
    }
}
```

坐标里的版本号就是 Mindustry 的构建号，换版本只改这一处。**必须分成两个依赖**：`core` 只有 Mindustry 的类，`arc-core` 是它依赖的 Arc 引擎（`arc.util.Log`、`arc.graphics.Color` 这些都在里面），只写前者会编译不过。

`settings.gradle`：

```groovy
rootProject.name = 'javamod-gradle'
```

### gradle.properties（可选）

需要走代理或限制内存时：

```properties
systemProp.http.proxyHost=your.proxy.host
systemProp.http.proxyPort=7890
systemProp.https.proxyHost=your.proxy.host
systemProp.https.proxyPort=7890
org.gradle.jvmargs=-Xmx1g
```

### 构建

```bash
gradle jar            # 首次会解析并下载依赖
gradle jar --offline  # 依赖已缓存时可离线构建（本教程实测通过）
```

产物 `build/libs/java-gradle-demo.jar` 的内容（实测清单）：

```
mod.json
gradledemo/GradleDemoMod.class
gradledemo/GradleDemoMod$1.class
META-INF/MANIFEST.MF
```

约定俗成的 `deploy` 任务就是把产物复制到 `mods/` 目录，动手写也没几行。

## 方式 B：javac + jar（零构建工具）

不想装 Gradle，或者只想快速试一段代码时，直接用 `javac` 编译、`jar` 打包。classpath 需要一份**含 Mindustry 类的 jar**，随便哪个都行：自己用 Gradle 构建出来的依赖 jar、官方 release 的 `dependencies.jar`，或者本教程验证用的 full 验证器 fat jar。

```bash
javac -cp mindustry-mod-validator-full-1.0.0-all.jar -d classes src/javaintro/JavaIntroMod.java

# 打成 jar：class 按包路径进 jar，mod.json 放根目录
cd classes && jar cf ../java-intro-demo.jar . && cd ..
jar uf java-intro-demo.jar mod.json
```

生成的 jar 结构：

```
mod.json
javaintro/JavaIntroMod.class
javaintro/JavaIntroMod$1.class
```

匿名内部类会被编译成单独的 `$1.class`，打包时整个 `classes/` 目录一起进去就不会漏。注意 `javac` 的 `-d classes` 必须和后面的打包目录是同一个，否则 jar 里没有 class。两种情况都实测过：写了 `"java": true` 时日志里会直接甩一行 `[E] java.lang.ClassNotFoundException: <主类全名>`，mod 以加载失败状态存在；没写 `java` 时更隐蔽——游戏把「主类文件不存在」当正常情况直接跳过类加载，只剩一行 `Loading mod: xxx`，你拿到一个没有任何内容、也没有主类的空 mod。

Source: core/src/mindustry/mod/Mods.java:1144-1147（主类文件查找与「存在或显式标记为 java」的加载条件）

## 部署

把 jar 复制进游戏的 `mods/` 目录：

```java
modDirectory = dataDirectory.child("mods/");
```

Source: core/src/mindustry/Vars.java:342（`Vars.modDirectory`）

常用路径 Windows `%AppData%/Mindustry/mods/`、Linux `~/.local/share/Mindustry/mods/`、macOS `~/Library/Application Support/Mindustry/mods/`。放进去后**重启游戏**：内容只在启动阶段创建一次，热替换无效。到了模组列表里能看到，就说明 jar 结构没问题。

## 环境层的四个硬门槛

| 门槛 | 后果 | 源码 |
| --- | --- | --- |
| 必须打包成 jar/zip | 目录形式不会加载 class | Mods.java:1129-1141 |
| `minGameVersion` 对 Java mod 要求 ≥ 154 | 低于门槛时类根本不会被加载 | Vars.java:53-55、Mods.java:1147-1154 |
| 依赖必须 `compileOnly` | 把 Mindustry 打进 jar 会被明确拒绝并报错 | Mods.java:1166-1173 |
| iOS 不支持 Java mod | 抛异常 `Java class mods are not supported on iOS.` | Mods.java:1156-1158 |

## 验证闭环

改完代码别急着进游戏，先让验证器在完整客户端环境里跑一遍——它会加载 mod、注册内容、跑方块与单位测试、编译 shader，并把问题分级列出来：

```bash
run-full.sh build/libs/java-gradle-demo.jar
```

实测输出：

```
状态: 通过
  错误: 0  警告: 6  信息: 6
[I] [java-gradle-demo] item name=java-gradle-demo-gradle-demo-item id=22 hardness=3 cost=1.5 color=66ccffff
[I] [java-gradle-demo] content.items().size=23
```

警告都是可选项缺失（`description`/`details`/`credit`/`techNode` 为 null）、缺贴图，以及验证器自带的着色器测试，不影响加载。

## 下一步

- 类 mod 的结构与生命周期：[介绍](../0-introduction/)
- 内容字段怎么写（物品、方块、炮塔、单位）：[JSON 内容定义](../../json/2-content/)
- 用 Kotlin 写、还想省掉模板代码：[kt-annotations](../../kotlin/kt-annotations/)
