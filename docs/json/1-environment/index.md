# 环境与文件结构：你的 mod 放在哪、由哪些文件组成

> 基线：原版 Mindustry v159.7。所有结论均附源码行号。

## mod 安装目录

游戏会把数据目录下的 `mods/` 作为 mod 根目录：

```java
modDirectory = dataDirectory.child("mods/");
```

Source: core/src/mindustry/Vars.java:342（`Vars.modDirectory`）

桌面端数据目录位置（在「设置 → 游戏数据」里可一键打开）：

- Windows：`%AppData%/Mindustry/mods/`
- Linux：`~/.local/share/Mindustry/mods/`
- macOS：`~/Library/Application Support/Mindustry/mods/`

把一个文件夹（或 zip）放进 `mods/` 即可被识别为 mod，不需要任何打包工具。游戏内「模组 → 导入模组」本质也是把文件复制进这个目录（Source: core/src/mindustry/mod/Mods.java:118-122，`importMod`）。

## 最小文件结构

```
my-first-mod/
├── mod.json          # 必需：元数据
└── content/          # 可选：JSON 内容定义
    ├── items/
    ├── liquids/
    └── blocks/
```

元数据文件名接受四种：`mod.json`、`mod.hjson`、`plugin.json`、`plugin.hjson`；找不到就报 "Invalid file: No mod.json found."。

Source: core/src/mindustry/mod/Mods.java:34（`metaFiles`）、Mods.java:1089

## mod.json 元数据字段

`ModMeta` 类定义了全部可写字段，常用的有：

| 字段 | 作用 | 备注 |
| --- | --- | --- |
| `name` | 内部名，会变成内容 ID 前缀 | 会被转小写、空格转 `-`（internalName） |
| `displayName` | 界面显示名 | 缺省回退为 `name` |
| `author` / `description` / `version` | 展示信息 | 颜色码会被剥掉 |
| `minGameVersion` | 最低游戏版本，如 `"159.7"` | 不满足则 mod 不加载 |
| `main` | Java mod 主类全名 | 纯 JSON mod 不需要 |
| `java` | 是否按 Java 类 mod 加载 | JSON mod 留 false |
| `contentOrder` | 指定内容加载顺序（按内容名） | 有依赖顺序时用 |

Source: core/src/mindustry/mod/Mods.java:1376-1400（`ModMeta` 字段）、Mods.java:1420（`cleanup()` internalName 生成）、Mods.java:1150/1285（`minGameVersion` 检查）

一个最小的 `mod.json`：

```json
{
  "name": "my-first-mod",
  "displayName": "我的第一个 mod",
  "author": "Eve.aic",
  "version": "1.0",
  "minGameVersion": "159.7",
  "description": "练手"
}
```

## content/ 目录的类型文件夹映射

加载内容时，游戏遍历 `ContentType` 全部枚举值，取类型名小写后拼接目录名——**以 s 结尾的类型名不再追加 s，其余追加 s**：

```java
Fi folder = contentRoot.child(lower + (lower.endsWith("s") ? "" : "s"));
```

Source: core/src/mindustry/mod/Mods.java:873-890（`loadContent` 扫描循环）

常用对应关系：

| 类型 | 文件夹 |
| --- | --- |
| item | `content/items/` |
| liquid | `content/liquids/` |
| block | `content/blocks/` |
| unit | `content/units/` |
| status | `content/status/`（status 本身以 s 结尾） |
| weather | `content/weathers/` |
| planet | `content/planets/` |

文件夹里**只识别 `.json` 和 `.hjson` 扩展名**，子目录里的文件也会被 `findAll` 递归找到（Source: core/src/mindustry/mod/Mods.java:879）。每个文件的对象里写 `"type"` 指定内容类型（不写则用该类型默认构造），文件名（去扩展名）就是内容的内部名，内部 ID = `mod名-文件名`（Source: core/src/mindustry/mod/ContentParser.java:1024-1046，`parse` 以文件名作为 name）。

## 特殊文件夹

以下文件夹不会被当作脚本/内容处理：`bundles`（多语言翻译）、`sprites`（贴图）、`sprites-override`（覆盖原版贴图）、`.git`。

Source: core/src/mindustry/mod/Mods.java:46（`specialFolders`）、Mods.java:628-638

## 常见踩坑

1. **`minGameVersion` 写太高或服务器版本过低**——mod 会被静默跳过，日志里才有线索（Source: core/src/mindustry/mod/Mods.java:1285）。
2. **文件夹名写错**（如 `content/item/`）——不会报错，只是内容完全不加载，按上表核对。
3. **文件扩展名写成 `.txt` 或大小写混乱**——同样静默不加载。
4. **name 含大写或空格**——会被规范化成 internalName 作前缀，跨 mod 引用时用规范化后的名字。

## 下一步

目录建好后，去 [内容定义](../2-content/) 写你的第一个物品、液体和方块。
