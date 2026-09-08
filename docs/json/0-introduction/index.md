# JSON Mod 入门：最小模组长什么样

> 作者：Eve.aic · 验证器：mindustry-mod-validator-full 通过（0 错误）

JSON mod 是 Mindustry 模组里**最轻量的一种**：不需要写任何代码，只用 `mod.json` 元数据加 `content/` 目录下的 JSON 文件，就能定义物品、液体、方块、单位等内容。它是零基础入坑 modding 的第一步。

## 一个最小 mod 的完整结构

```
my-mod/
├── mod.json                  # 模组元数据（必填）
└── content/
    ├── items/                # 物品
    │   └── example-ingot.json
    └── liquids/              # 液体
        └── example-fluid.json
```

### mod.json：模组的名片

```json
{
  "name": "my-mod",
  "displayName": "我的第一个模组",
  "author": "Eve.aic",
  "description": "一个用来学习的最小 JSON mod",
  "version": "1.0.0",
  "minGameVersion": "159.7"
}
```

`mod.json` 解析进 `ModMeta`，可用字段：`name`、`displayName`、`author`、`description`、`subtitle`、`version`、`minGameVersion`、`main`、`repo`、`dependencies`、`softDependencies` 等。其中 `name` 是模组内部名（不含空格，会转成小写并用 `-` 连接），`displayName` 是模组列表里显示的名字，缺省时等于 `name`。

Source: 源码和示例/Mindustry/core/src/mindustry/mod/Mods.java:1376-1395, 1409-1415

`minGameVersion` 是兼容性门槛：当前游戏版本低于它时模组会被拒绝加载。

Source: 源码和示例/Mindustry/core/src/mindustry/mod/Mods.java:1150, 1285

### content/：按类型分目录

游戏只扫描 `content/` 目录，并且**按内容类型分成固定名字的子目录**，目录名来自 `ContentType` 枚举：小写类型名，不足复数就加 `s`。

| 内容类型 | 目录名 |
|---|---|
| item | `items/` |
| liquid | `liquids/` |
| block | `blocks/` |
| unit | `units/` |
| status（效果） | `statuses/` |
| weather | `weather/` |
| sector | `sectors/` |
| planet | `planets/` |
| team | `teams/` |
| unitCommand / unitStance | `unitCommands/` / `unitStances/` |

Source: 源码和示例/Mindustry/core/src/mindustry/ctype/ContentType.java:11-28

目录下只接受 `.json` 和 `.hjson` 两种扩展名的文件。

Source: 源码和示例/Mindustry/core/src/mindustry/mod/Mods.java:876-879

> 注意：文件必须放在 `content/<type>/` 里才会被扫描；放错目录（比如放到 mod 根目录）会**静默不加载**，游戏也不报错。

## 内容 ID 与显示名：最容易误解的一点

**一个内容文件的内部 ID 是「文件名（不含扩展名）」**，不是 JSON 里的任何字段。加载时游戏把 ID 拼成 `mod名-文件名`，例如文件 `content/items/example-ingot.json` 在 mod `my-mod` 里注册为 `my-mod-example-ingot`。

Source: 源码和示例/Mindustry/core/src/mindustry/mod/ContentParser.java:934

JSON 里写的 `"name"` 字段**不是内部 ID，而是显示名**：它会被抽出来写进语言包（bundle），键是 `item.my-mod-example-ingot.name`；`"description"` 同理，键是 `...description`。所以内容在游戏里的本地化名称也可以后续放到 `bundles/bundle_zh_CN.properties` 里覆盖。

Source: 源码和示例/Mindustry/core/src/mindustry/mod/ContentParser.java:939-960

## 跑一个真实的最小 mod

把上面两个内容文件写进去（具体字段见 [物品与液体](../2-content/1-item-and-fluid) 一章），用验证器加载：

```bash
run-full.sh my-mod/
# 结果：错误 0，状态 通过
# [item/my-mod-example-ingot] 已注册
# [liquid/my-mod-example-fluid] 已注册
```

验证器实测：物品与液体都成功注册，仅有的警告是缺失贴图（教程示例没配图）与 `description`/`techNode` 未填——这些是可选项，不影响加载。

## 小结

- JSON mod = `mod.json` + `content/<类型目录>/<文件名>.json`
- 内部 ID 来自文件名，显示名来自 JSON 里的 `name` 字段
- 目录名固定（`items`、`liquids`、`blocks`…），放错位置会静默失败
- 下一步：读 [内容定义：物品与液体](../2-content/1-item-and-fluid)，开始定义你的第一份内容
