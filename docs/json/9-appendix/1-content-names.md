# 给物品起中文名：文件名、name 和语言文件

> 作者：Eve.aic · 2026-09-20
> 源码基线：原版 Mindustry **v159.7**（`c9686eb5d0ae5dd47ee02c40f99f7d5018ccbc8c`）。文中 Source 路径相对于该版本的 Mindustry 仓库。
> 示例先通过完整客户端验证，再核对源码；另外用断言检查了最终中文名和说明。

做出物品后，先别急着加更多字段。这一篇只解决一个问题：**怎样让玩家看到你起的中文名，同时不改物品的内部名字。**

还没写过 JSON？先读 [JSON 语法十分钟速通](../0-introduction/2-json-basics)。已经能加载物品，就直接往下做。

## 先分清三种名字

这次的模组叫 `naming-demo`，物品文件叫 `blue-chip.json`。

| 写在哪 | 本例的值 | 用途 |
| --- | --- | --- |
| `mod.json` 的 `name` | `naming-demo` | 模组名，是本例内容名前缀的一部分 |
| `content/items/blue-chip.json` 的文件名 | `blue-chip` | 与模组名组合，得到 `naming-demo-blue-chip` |
| 物品 JSON 的 `name` | `Blue Chip` | 显示用的文字，可被语言文件提供的文字取代 |

游戏把不带扩展名的文件名传给解析器；新物品创建时拼上模组名前缀。物品 JSON 内的 `name` 则交给语言包处理，不用于给物品换内部名字。Source: core/src/mindustry/mod/Mods.java:910-914（loadContent）；core/src/mindustry/mod/ContentParser.java:922-960（parser、readBundle）。

所以，**只想改玩家看到的名字，就改显示文字，先别改文件名**。上表中的内部名字在下文保持不变。Source: core/src/mindustry/mod/ContentParser.java:930-951（parser、readBundle）。

## 准备这个小例子

示例只有一个物品。文件放在下面这些位置：

```text
naming-demo/
├── mod.json
├── content/items/blue-chip.json
├── bundles/bundle.properties
└── sprites/blue-chip.png
```

物品文件要在 `content/items/`，语言文件要在模组根目录下的 `bundles/`。这两个位置有各自的扫描入口。Source: core/src/mindustry/mod/Mods.java:635-644（buildFiles）、874-879（loadContent）。

`mod.json`：

```json
{
  "name": "naming-demo",
  "displayName": "Naming Demo",
  "author": "Eve.aic",
  "version": "1.0",
  "minGameVersion": "159.7"
}
```

这里保留模组名、展示名、作者、版本和最低游戏版本；对应字段都在 `ModMeta` 中。Source: core/src/mindustry/mod/Mods.java:1376-1383（ModMeta）。

`content/items/blue-chip.json`：

```json
{
  "name": "Blue Chip",
  "description": "A small tutorial item.",
  "color": "78bfff"
}
```

`name` 是显示名，`description` 是说明；`color` 是物品的颜色字段。今天不用调整其他物品参数。Source: core/src/mindustry/mod/ContentParser.java:939-960（readBundle）；core/src/mindustry/type/Item.java:18-19（Item.color）。

配套下载里带有一张 32×32 的蓝色方块图片。它只是本次测试用的占位图，不是美术示范。

## 用两行文字换成中文

新建 `bundles/bundle.properties`，内容如下。注意：这是 properties 文件，不是 JSON，不要套大括号。

```properties
item.naming-demo-blue-chip.name = 蓝色芯片
item.naming-demo-blue-chip.description = 用来练习命名的物品。
```

可以把等号左边拆成三段看：

- `item`：这份内容是物品。
- `naming-demo-blue-chip`：上面算出的完整内部名字。
- `name` 或 `description`：要替换的显示名或说明。

物品创建时，显示名从 `item.内部名字.name` 读取，说明从 `item.内部名字.description` 读取。因此这里必须带上 `naming-demo-`，不能只写文件名。Source: core/src/mindustry/ctype/UnlockableContent.java:87-93（构造器）；core/src/mindustry/mod/ContentParser.java:930-942（parser、readBundle）。

**为什么 JSON 写着英文，最后却得到中文？** 解析器处理 JSON 的 `name` 和 `description` 时，会先检查语言包里有没有对应键；已有文字就不再用 JSON 的文字补进去。本例的两行中文已经提供了这两个键。Source: core/src/mindustry/mod/ContentParser.java:946-959（readBundle）。

本篇使用不带语言后缀的 `bundle.properties`，先把一个通用文本例子跑通。加载器沿当前语言包及其父级逐层合并文件；文件名由 `bundle` 和该层的 locale 拼成，根语言层对应 `bundle.properties`。这不是“仅简体中文生效”的配置，本篇也不展开多语言切换。Source: core/src/mindustry/mod/Mods.java:648-661（buildFiles）。

## 不生效时，只检查这三处

1. **路径是不是 `bundles/bundle.properties`？** 拼错目录或扩展名，就不符合这段扫描规则。Source: core/src/mindustry/mod/Mods.java:635-644（buildFiles）。
2. **等号左边有没有漏掉模组名前缀？** 本例查找的是 `item.naming-demo-blue-chip.name`。Source: core/src/mindustry/mod/ContentParser.java:930-942（parser、readBundle）；core/src/mindustry/ctype/UnlockableContent.java:90-91（构造器）。
3. **是否只改了 JSON，却留着旧语言文件？** 已存在的同名语言键会使 JSON 的显示文字不再被补入。先核对两处文本。Source: core/src/mindustry/mod/ContentParser.java:946-959（readBundle）。

不要靠把物品文件改成中文名来排查。那会改变传给解析器的内容名字，和这次要改的显示文字不是同一处。Source: core/src/mindustry/mod/Mods.java:910-914（loadContent）；core/src/mindustry/mod/ContentParser.java:930-951（parser、readBundle）。

## 本次实际验证了什么

[下载本篇完整 JSON 示例](/examples/naming-demo.zip)。上面的两个 JSON 和 properties 代码块与验证文件一致。

先对纯 JSON 模组运行 `mindustry-mod-validator-full/run-full.sh`：退出码 **0**，报告为 `passed`、**0 错误、4 警告**，内容清单中确有 `naming-demo-blue-chip`，不是空模组通过。

随后在相同内容的测试副本里增加一个 Java 断言探针，再跑同一个验证器。探针检查物品存在、显示名等于“蓝色芯片”、说明等于“用来练习命名的物品。”；任一不符就抛异常。第二次同样退出码 0，日志记录：

```text
NAMING_ASSERT_OK id=naming-demo-blue-chip name=蓝色芯片 description=用来练习命名的物品。
```

四条警告分别是 `details`、`credit`、`techNode` 为 null，以及验证器的 `shader-multiframe` 提示。本次没有方块或单位，不把“未找到可测方块/单位”当成 600 tick 行为验证；也没有做多语言切换或界面截图验收。

本机复查证据：

- 纯 JSON 日志：`/root/cow/tmp/blog-20260920/validator.log`
- 汇总与注册清单：`/root/cow/tmp/blog-20260920/report/summary.json`、`report/content/items.json`
- 断言日志：`/root/cow/tmp/blog-20260920/probe-validator.log`
- 断言探针源码：`/root/cow/tmp/blog-20260920/NamingProbe.java`
- 固定版本源码摘取：`/root/cow/tmp/blog-20260920/source-v159.7/`，由本地仓库 `git show v159.7:路径` 导出。

完成后，可以回到 [物品与液体](../2-content/1-item-and-fluid) 继续填内容；遇到名字混乱，再用这篇的三列表逐项对照。
