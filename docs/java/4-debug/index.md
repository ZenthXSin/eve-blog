# 调试：日志、验证器报告与常见报错

> 本章带你走一遍 Java mod 的调试闭环：`Log` 打点输出 → 验证器实机跑 → 报告解读 → 定位报错。全部结论基于原版 v159.7 源码与实机验证。

## 一、最直接的调试手段：Log

Mindustry 的日志工具是 `arc.util.Log`（Arc 通用组件，不是 Mindustry 自己写的）。四个常用级别：

| 方法 | 级别 | 说明 |
|---|---|---|
| `Log.debug(msg, args...)` | debug | 默认不输出，见下 |
| `Log.info(msg, args...)` | info | 常规信息 |
| `Log.warn(msg, args...)` | warn | 警告 |
| `Log.err(msg, args...)` | err | 错误 |
| `Log.err(Throwable)` | err | 直接打印异常堆栈 |

Source: `Arc/arc-core/src/arc/util/Log.java:14-68 (Log.log/debug/info/warn/err)`

### 占位符是 `@`，不是 `%s`

`Log.info("进度 @ / @", 1, 10)` 里的 `@` 会被依次替换成参数，实现是 `Strings.format`，不是 Java 的 `String.format`。写习惯了 `%s` 会直接原样打出 `%s`。

Source: `Arc/arc-core/src/arc/util/Log.java:111-113 (DefaultLogFormatter.format → Strings.format)`

### 默认只显示 info 及以上

`Log.level` 默认是 `LogLevel.info`；`log()` 入口先判断 `if(Log.level.ordinal() > level.ordinal()) return;`，所以 **debug 级别的日志默认根本不会出现**，不是你的代码没执行。想在验证器/服务器里看到 debug，需要把级别调到 `Log.debug`。

Source: `Arc/arc-core/src/arc/util/Log.java:10 (level=LogLevel.info)`、`Log.java:14-16 (log 级别过滤)`

### 运行时捕获异常：`Log.err(Throwable)`

业务代码里 try-catch 后不要只 `Log.err("出错了")`，用 `Log.err(e)` 会把完整堆栈打出来（内部 `printStackTrace` 转字符串），定位行号就靠它。

Source: `Arc/arc-core/src/arc/util/Log.java:61-67 (err(Throwable))`

### 实机验证：一个到处打点的 mod

示例 mod `java-debug-demo`（`/root/cow/tmp/javamod-debug`）在 `loadContent()`、`init()`、方块 `updateTile()` 里各打了几条不同级别日志。验证器运行日志如下：

```
[I] Loading mod: java-debug-demo
[I] [java-debug-demo] loadContent 完成：java-debug-demo-demo-block 已注册
[I] [java-debug-demo] init 钩子执行，world=100x50
[W] [java-debug-demo] 这是一条警告，用于演示 warn 级别
[E] [java-debug-demo] 这是一条错误，用于演示 err 级别（示例故意为之）
[E] java.lang.IllegalArgumentException: [java-debug-demo] 故意抛出的异常
[I] [java-debug-demo] 占位符测试：42 个演示
```

注意：`loadContent()` 里那条 `Log.debug("[java-debug-demo] 这行是 debug 级别，默认看不见")` **没有出现在日志里**——正是级别过滤的效果。验证器退出码 0，报告「状态: 通过，错误: 0」。

## 二、验证器报告怎么读

`mindustry-mod-validator-full` 的最终报告长这样（上例）：

```
状态: 通过
错误: 0
警告: 16
信息: 6
```

常见条目按类别解释：

### content-anomaly（字段为 null）

`[WARN] [content-anomaly] [block/...] final: Block.itemDrop = 字段值为 null，可能未初始化` 这类警告最多，但**绝大多数是可选字段，不是你写错了**。示例里 14 条 anomaly 全是 `itemDrop / destroyBullet / researchCost / description / techNode / credit` 这类没赋值时的默认 null，属于正常现象。真正需要警惕的是「你明明赋值了却还是 null」或「不该为 null 的核心字段（如 size、health）为 null」。

### missing-sprite（缺贴图）

`[WARN] [missing-sprite] [block/java-debug-demo-demo-block] 缺失贴图: java-debug-demo-demo-block` —— 代码里 `new Block("demo-block")` 需要配套贴图（名字规则：`模组名-方块名`，即 `java-debug-demo-demo-block`），测试阶段没放贴图时必然出现，可以忽略；正式发布前补图即可。

### shader-multiframe / liquid-tank 测试

`[WARN] [shader-multiframe] 所有帧像素完全一致，着色器动画可能未生效` 是验证器内置的 liquid-tank shader 测试，与你的 mod 无关（示例 mod 没有任何 shader，这警告是内置测试的固定输出）。

### block-test / unit-test（真正干活的两项）

```
[INFO] [block-test] 方块测试完成: 1 通过, 0 崩溃, 共 1 个 (600 tick)
[INFO] [unit-test] 未找到模组单位进行测试
```

把 mod 里的每个方块/单位放到真实世界里跑 600 tick，崩溃会记为 ERROR。**这是判定 mod 能不能落地的最重要指标**：错误 0 + block-test 通过数 = 你的方块数，才说明代码真能跑。

## 三、常见加载失败：mod 压根没起来

日志只有一行 `[I] Loading mod: xxx` 之后什么都没有？多半是主类没被找到。加载判断在 `Mods.java`：

```java
//make sure the main class exists before loading it; if it doesn't just don't put it there
//if the mod is explicitly marked as java, try loading it anyway
if(
    (mainFile.exists() || meta.java) && ...
```

Source: `Mindustry/core/src/mindustry/mod/Mods.java:1141-1147 (主类存在判断)`、`Mods.java:1158-1188 (Class.forName 加载)`

对应两种实测行为：

1. **mod.json 里写了 `"java": true` 但 class 不存在**：会尝试 `Class.forName`，日志报 `[E] java.lang.ClassNotFoundException: <主类全名>`，mod 以加载失败状态存在，验证器仍可能报「通过/错误 0」（因为它只检查内容加载，没检查主类加载成功与否）——**这时候不能只看报告，要看完整日志的 `[E]`**。
2. **没写 `java` 且没有 `main` 字段、class 也不在**：静默跳过，只有一行 `Loading mod: xxx`，无主类、无内容。

另外有个经典编译期错误：把 Mindustry/Arc 依赖打进了 jar。加载时会主动报：

```
ModLoadException: This mod/plugin has loaded Mindustry dependencies from its own class loader.
```

Source: `Mindustry/core/src/mindustry/mod/Mods.java:1163-1174 (自加载依赖检测)` —— Gradle 里 Mindustry 必须用 `compileOnly`，不要打进产物。

## 四、调试闭环速查

1. 怀疑逻辑问题 → 在 `loadContent()`/`init()`/`updateTile()` 里 `Log.info` 打点，带 `@` 占位符；
2. 怀疑异常 → try-catch 后 `Log.err(e)` 打堆栈，看第一行定位到你的类；
3. 怀疑没加载 → 看完整日志有没有 `ClassNotFoundException`，确认 jar 里 class 路径与 `main` 字段一致（`jar tf xxx.jar` 核对）；
4. 怀疑内容问题 → 跑 `run-full.sh`，重点看 **block-test 通过数 = 你的方块数**；
5. debug 级别日志看不到 → 先确认是不是被 `Log.level=info` 过滤了，别急着改代码。

## 示例与配套

- 示例 mod 源码：`/root/cow/tmp/javamod-debug`（`java-debug-demo.jar`，验证器错误 0）
- 验证器：`mindustry-mod-validator-full` 的 `run-full.sh`