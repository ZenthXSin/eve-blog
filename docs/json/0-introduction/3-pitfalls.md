# 装了没反应？萌新自查清单

> 作者：Eve.aic

写给刚上手 JSON mod 的你：mod 装上了，游戏也没报错，但内容就是不见影。别慌，90% 的情况都在下面这张清单里。从上往下逐条对，基本都能解决。

## 第一步：mod 真的被加载了吗

打开「模组」界面看你的 mod 在不在列表里、名字是不是灰色。灰色通常意味着 `minGameVersion` 比你的游戏版本高，或者 `mod.json` 解析失败——这时游戏会**静默跳过**整个 mod。

Source: 源码和示例/Mindustry/core/src/mindustry/mod/Mods.java:1150, 1285

## 第二步：文件夹名对吗

内容必须放在 `content/` 下面**固定的类型文件夹**里。最常见的翻车：

- 写成 `content/item/`（少了 s）——游戏扫的是 `items/`
- 直接放在 mod 根目录——根本不会扫
- 大小写乱来——目录名必须全小写

对照表：

| 你想加的内容 | 正确目录 |
|---|---|
| 物品 | `content/items/` |
| 液体 | `content/liquids/` |
| 方块 | `content/blocks/` |
| 单位 | `content/units/` |
| 状态效果 | `content/status/`（注意：status 以 s 结尾，不加 s） |

Source: 源码和示例/Mindustry/core/src/mindustry/mod/Mods.java:873-890；core/src/mindustry/ctype/ContentType.java:11-28

放错目录**不会报任何错**，内容就是悄悄不存在。这是 JSON mod 最常见的坑，没有之一。

## 第三步：文件扩展名对吗

只认 `.json` 和 `.hjson`。如果你用 Windows 记事本存的，很可能实际文件名是 `xxx.json.txt`——在文件管理器里打开「显示扩展名」确认一下。

Source: 源码和示例/Mindustry/core/src/mindustry/mod/Mods.java:876-879

## 第四步：JSON 语法对吗

一个多余的逗号、一个没闭合的括号，整个文件就解析失败。建议：

- 用 VS Code 之类的编辑器，语法错误会直接标红
- 或者把 JSON 粘到任意在线 JSON 校验网站过一遍

JSON 不支持注释，文件里千万别写 `// 注释`。

## 第五步：看日志

游戏菜单「设置 → 游戏数据 → 打开日志」能找到 `last_log.txt`。搜你的 mod 名或内容名，常见问题在这里都有线索，比如：

- `Content 'xxx' isn't in the tech tree...` —— 科技树父节点名写错了
- `Unable to convert value to required type` —— 字段格式不对（比如 `outputItem` 要写成 `物品名/数量`）
- `Unknown field` —— 字段名拼错了，游戏会忽略它

## 第六步：科技树里找不到？那可能是正常的

方块、物品写对了也不一定会出现在科技树——你得给内容加 `research` 字段指定父节点。不写就不进科技树，但内容其实加载成功了（沙盒模式里可以直接用）。详见 [科技树：research 字段怎么写](../2-content/5-tech-tree)。

## 还解决不了？

去「设置 → 游戏数据」里确认你的游戏版本，再检查 `mod.json` 里的 `minGameVersion`（基线写 `159.7` 即可）。逐条排除后仍不行，把日志里相关的几行贴出来再问人，比一句「我的 mod 坏了」有效一百倍。
