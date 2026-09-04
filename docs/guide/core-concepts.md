# 一、核心概念


### 1.1 它解决什么问题

Mindustry 官方用 Java 注解处理器（EntityAnno）在编译期做「组件 → 实体」的装配：

```java
@EntityDef({Unitc.class, UnitEntityc.class})
public abstract class UnitEntity { ... }
```

kt-annotations 把这条链路搬到 Kotlin：你写 `@Component` / `@EntityDef` 注解的 Kotlin 类，构建时插件扫描源码、生成实体类/接口/网络包等代码，和你的手写代码一起编译进 mod。

### 1.2 处理流水线

```
src/**/*.kt
   │  ContentScanner（Kotlin PSI 解析：类/字段/方法/注解，类型名→FQN）
   ▼
KtClass / KtField / KtMethod 模型
   │  5 个生成器
   ▼
build/generated/ktannot/main/kotlin/   ← 生成代码
   │  与手写代码一起编译（需手动把该目录加进 kotlin srcDir）
   ▼
mod jar
```

### 1.3 两种模式

| | `mindustryMode = false`（默认） | `mindustryMode = true` |
|---|---|---|
| 生成代码对接 | 内置桩：`io.eve.ktannot.gen.Packet/ByteBuf/Writes/Reads/Net/Player/Core` | 真实引擎：`mindustry.net.Packet`、`arc.util.io.Writes/Reads`、`arc.Core.atlas`、`mindustry.io.TypeIO`、`mindustry.Vars.net` |
| 用途 | 纯 JVM 单元测试（`tests/` 模块） | 真实 Mindustry mod（`realmod/`、`vanilla/` 模块） |
| 实体同步 IO | `ByteBuf.putFloat/getFloat` | `Writes.f()/Reads.f()` |
| 贴图加载 | `Core.atlas.find(...)` | `arc.Core.atlas.find(...)` |
| 网络包 | 桩 `Packet` 子类 | `mindustry.net.Packet` 子类，注册到 `Net.registerPacket` |

### 1.4 生成代码的位置与包

- 默认输出：`build/generated/ktannot/main/kotlin/`
- 默认包：`io.eve.ktannot.gen`（可通过 `ktAnnotations { genPackage = "..." }` 修改）
- **重要**：生成代码会给接口/实体打上 `@EntityInterface` 注解，该注解引用 `genPackage` 包下的 `EntityInterface` —— 消费模块必须自己在 gen 包中声明一个（见 [8.3](../reference/plugin-config.md#_8-3-genpackage-与-entityinterface)）。

