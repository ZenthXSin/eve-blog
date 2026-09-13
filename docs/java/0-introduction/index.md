# Java Mod 入门：第一个类 mod

> 作者：Eve.aic · 示例已在 mindustry-mod-validator-full（完整客户端环境）实机验证，错误 0
> 基线：原版 Mindustry v159.7，所有机制结论附源码行号

JSON mod 能**定义**内容，但定义不了**行为**。想让方块每 tick 算点东西、想让产出随环境变化、想加自己的 UI——这些都写在代码里。Java 是官方支持最完整的一条路：类被游戏直接加载，不需要任何中间层。

## Java mod 和 JSON mod 差在哪

| | JSON mod | Java mod |
| --- | --- | --- |
| 交付形式 | 一个文件夹（`mod.json` + `content/*.json`） | 一个打包好的 `.jar` |
| 能力 | 填字段能表达的内容 | 内容 + 任意逻辑 |
| 生效方式 | 游戏解析 JSON | 类被加载、实例化、回调 |
| 门槛 | 会写 JSON | 会 Java + 会构建 |

两者不冲突：同一个 mod 可以既放 `content/` 又带 Java 类。能用 JSON 字段表达的，优先用 JSON。

## 最小结构

源码：

```
java-intro-demo/
├── mod.json                            # 元数据
└── src/javaintro/JavaIntroMod.java     # 主类
```

编译打包后交给游戏的 `java-intro-demo.jar`：

```
java-intro-demo.jar
├── mod.json                            # 必须在 jar 根目录
└── javaintro/
    ├── JavaIntroMod.class
    └── JavaIntroMod$1.class            # 匿名内部类会被单独编译
```

游戏找元数据的文件名固定为 `mod.json`、`mod.hjson`、`plugin.json`、`plugin.hjson` 四个之一，找不到就报 `Invalid file: No mod.json found.` 并拒绝这个 mod。

Source: core/src/mindustry/mod/Mods.java:34（`metaFiles`）、Mods.java:1089（报错文本）

### mod.json 需要多写两个字段

```json
{
  "name": "java-intro-demo",
  "displayName": "Java Intro Demo",
  "author": "Eve.aic",
  "description": "教程示例：最小 Java mod",
  "version": "1.0.0",
  "minGameVersion": "159.7",
  "main": "javaintro.JavaIntroMod",
  "java": true
}
```

| 字段 | 作用 |
| --- | --- |
| `main` | 主类全名（含包名）。**不写**时游戏按 `name` 推断：去掉空格→转小写当包名，原名当类名加 `Mod` 后缀 |
| `java` | 标记为类 mod。技术上可选，官方注释写明「highly recommended」 |
| `minGameVersion` | Java mod 的门槛比 JSON mod 高，见下 |

Source: core/src/mindustry/mod/Mods.java:1383-1395（`ModMeta` 的 `main`/`java` 字段定义）、Mods.java:1248-1250（`isJava()`）、Mods.java:1093-1094（`main` 缺省时的类名推断）

**Java mod 有单独的版本门槛**：普通 mod 最低 136，Java mod 最低 154——因为 Java 侧的 API 破坏性改动更多。不满足条件时，就算 `java: true` 也不会去加载类，mod 会以「无主类」的状态存在。

Source: core/src/mindustry/Vars.java:53-55（`minModGameVersion = 136`、`minJavaModGameVersion = 154`）、Mods.java:1147-1154（加载条件判断）、Mods.java:1295（状态判定）

## Mod 类的钩子

主类继承 `mindustry.mod.Mod`，五个钩子按用途分工：

| 方法 | 何时被调用 | 该干什么 |
| --- | --- | --- |
| `loadContent()` | 所有 mod 的内容创建阶段 | **创建内容对象**（物品、方块、单位…） |
| `init()` | 全部模块初始化完成后 | 注册事件监听、做与具体方块/地图无关的初始化 |
| `packSprites(MultiPacker)` | 打包贴图集时 | 往图集里加自定义贴图 |
| `registerServerCommands(CommandHandler)` | 服务端控制台初始化 | 注册服务端命令 |
| `registerClientCommands(CommandHandler)` | 客户端初始化 | 注册客户端命令 |

Source: core/src/mindustry/mod/Mod.java:21-43（五个钩子的定义与文档注释）

调用点也是确定的：

- `loadContent()` 由 `Mods.loadContent()` 遍历所有非 hidden 的类 mod 逐个调用，调用前先 `content.setCurrentMod(mod)`（这决定了内容的命名前缀，见下一节）。
  Source: core/src/mindustry/mod/Mods.java:833-841
- `init()` 在客户端所有资源加载完后调用一次：`mods.eachClass(Mod::init)`。
  Source: core/src/mindustry/ClientLauncher.java:241；服务端同样一行在 server/src/mindustry/server/ServerLauncher.java:80
- `packSprites()` 在打包图集时调用：`if(mod.main != null) mod.main.packSprites(packer);`
  Source: core/src/mindustry/mod/Mods.java:174

> 实用推论：**内容在哪创建，前缀就是谁**。`loadContent()` 期间 `currentMod` 是你自己，所以内容名会带 mod 前缀；这个窗口之外创建的内容就没有前缀了。要创建内容，就写在 `loadContent()` 里。

## 内容不需要手动注册

Java mod 里没有「register」这种调用。`Content` 的构造函数自己就完成了注册：

```java
public Content(){
    this.id = (short)Vars.content.getBy(getContentType()).size;
    Vars.content.handleContent(this);
}
```

Source: core/src/mindustry/ctype/Content.java:20-23

带名字的内容（`MappableContent`）在构造时多做一步：把名字交给 `ContentLoader.transformName` 加前缀——前缀就是 `当前 mod 名 + "-"`，而 `LoadedMod.name` 是 `name` 去空格转小写后的结果。

Source: core/src/mindustry/ctype/MappableContent.java:10-13、core/src/mindustry/core/ContentLoader.java:175-178（`handleContent`）、ContentLoader.java:184-186（`transformName`）、Mods.java:1245（`LoadedMod` 的 `name` 规范化）

所以 `new Item("java-demo-item")` 在 mod `java-intro-demo` 里，注册名是 **`java-intro-demo-java-demo-item`**，id 顺排在原版内容之后（实测 22，原版物品共 22 个）。

顺带一提，原版内容先创建、mod 内容后创建：`ContentLoader.createBaseContent()` 负责原版，`createModContent()` 里才调 `mods.loadContent()`。

Source: core/src/mindustry/core/ContentLoader.java:58（`createBaseContent`）、ContentLoader.java:77-81（`createModContent`）

## 完整示例（本页代码已实机验证）

`src/javaintro/JavaIntroMod.java`：

```java
package javaintro;

import arc.graphics.Color;
import arc.util.Log;
import mindustry.mod.Mod;
import mindustry.type.Item;
import mindustry.Vars;

public class JavaIntroMod extends Mod{
    public static Item demoItem;

    @Override
    public void loadContent(){
        demoItem = new Item("java-demo-item"){{
            hardness = 2;
            cost = 1.2f;
            color = Color.valueOf("ffcc55");
        }};
    }

    @Override
    public void init(){
        Log.info("[java-intro-demo] item registered: name=@ id=@ hardness=@ cost=@ color=@",
            demoItem.name, demoItem.id, demoItem.hardness, demoItem.cost, demoItem.color);
        Item found = Vars.content.item(demoItem.id);
        Log.info("[java-intro-demo] lookup by id @ -> name=@", demoItem.id, (found == null ? "null" : found.name));
        Log.info("[java-intro-demo] total items=@", Vars.content.items().size);
    }
}
```

`Item` 的字段含义与 JSON mod 完全一致（`hardness` 是钻头硬度、`cost` 折算建造时间、`color` 是物品底色），只是这里用 Java 赋值而不是 JSON。JSON 侧的字段表见 [物品与液体](../../json/2-content/1-item-and-fluid)。

编译与打包（用任意含 Mindustry 类的 jar 当 classpath，教程里用的是验证器的 fat jar）：

```bash
javac -cp mindustry-mod-validator-full-1.0.0-all.jar -d classes src/javaintro/JavaIntroMod.java

# jar 根目录放 mod.json，class 按包路径放
cd classes && jar cf ../java-intro-demo.jar . && cd ..
jar uf java-intro-demo.jar mod.json
```

把 `java-intro-demo.jar` 丢进 `mods/` 目录（位置见 [环境与文件结构](../../json/1-environment/)）重启游戏即可。

验证器实测输出（错误 0，状态通过）：

```
模组: java-intro-demo
状态: 通过
  错误: 0  警告: 6  信息: 6

[I] [java-intro-demo] item registered: name=java-intro-demo-java-demo-item id=22 hardness=2 cost=1.2 color=ffcc55ff
[I] [java-intro-demo] lookup by id 22 -> name=java-intro-demo-java-demo-item
[I] [java-intro-demo] total items=23
```

6 条警告都是可选项导致的：4 条 `content-anomaly` 说 `description`/`details`/`credit`/`techNode` 为 null（这些字段不填也能跑）、1 条 `missing-sprite` 说没配贴图、1 条 `shader-multiframe` 是验证器自带的着色器测试，与 mod 无关。

## 四个坑

1. **不要把 Mindustry 打进 jar**。依赖必须是 `compileOnly`。游戏会检查主类的父类是不是从自己的类加载器加载的，串了就直接拒绝并给出明确报错：
   > This mod/plugin has loaded Mindustry dependencies from its own class loader. You are incorrectly including Mindustry dependencies in the mod JAR - make sure Mindustry is declared as `compileOnly` in Gradle, and that the JAR is created with `runtimeClasspath`!

   Source: core/src/mindustry/mod/Mods.java:1166-1173
2. **iOS 不支持 Java mod**，加载时会直接抛异常 `Java class mods are not supported on iOS.`
   Source: core/src/mindustry/mod/Mods.java:1156-1158
3. **Java mod 必须打包成 jar/zip**，直接放源码文件夹（JSON mod 那样）不会加载 class 文件——游戏是在 zip 里逐级找 `主类名.class` 的。
   Source: core/src/mindustry/mod/Mods.java:1129-1141（`mainFile` 逐级查找）
4. **改完要重新编译打包并重启**：内容只在启动阶段创建一次，热改无效。

## 下一步

- 环境怎么搭、依赖怎么配、产物怎么部署：[环境搭建](../1-environment/)
- 内容定义的字段细节（物品、方块、炮塔、单位）先看 JSON 侧：[内容定义](../../json/2-content/)
- 只想写内容、不想写代码：[JSON 模组教程](../../json/)
