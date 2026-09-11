# 科技树：research 字段怎么写

> 作者：Eve.aic · 验证器：mindustry-mod-validator-full 通过（0 错误）

写好的物品、方块默认**不会出现在科技树里**——战役里研究界面找不到它们。要让内容可研究，只需在 JSON 里加一个 `research` 字段，告诉游戏「它挂在谁的下面」。

## 最简写法：一个字符串

`research` 的值是**父节点的内容内部名**（原版内容直接写名字，自己 mod 的内容写文件名）：

```json
{
  "name": "示例锭",
  "color": "aabbcc",
  "research": "graphite"
}
```

这表示「示例锭」挂在原版「石墨（graphite）」节点下面，研究完石墨后就能研究它。

`research` 可以是一个字符串，也可以是一个对象；是字符串时直接当作父节点名。

Source: 源码和示例/Mindustry/core/src/mindustry/mod/ContentParser.java:1349-1356

父节点查找时会依次尝试：原名、`mod名-原名`、存档回退名。所以引用自己 mod 的内容时写文件名（不含扩展名）即可，不用手动加 mod 前缀。

Source: 源码和示例/Mindustry/core/src/mindustry/mod/ContentParser.java:1404-1406

## 完整写法：对象形式

想自定义研究消耗，用对象形式：

```json
"research": {
  "parent": "graphite-press",
  "requirements": ["copper/150", "lead/100"]
}
```

- `parent`：父节点内容名，同上
- `requirements`：研究消耗，格式是 `物品名/数量` 的数组，和方块建造成本写法一样

不写 `requirements` 时，研究消耗由内容自己的 `researchRequirements()` 自动生成（通常按建造成本换算）。

Source: 源码和示例/Mindustry/core/src/mindustry/mod/ContentParser.java:1354-1356, 1394-1396

## 可选字段

对象形式还支持这些字段：

| 字段 | 类型 | 作用 |
|---|---|---|
| `parent` | string | 父节点内容名 |
| `requirements` | ItemStack[] | 自定义研究消耗 |
| `objectives` | Objective[] | 额外研究目标（如占领某区块） |
| `planet` | string | 节点归属的星球 |
| `root` | bool | 为 true 时作为一棵新科技树的根 |
| `name` | string | `root: true` 时根节点的名字 |
| `requiresUnlock` | bool | 根节点是否需要先解锁才可见 |

Source: 源码和示例/Mindustry/core/src/mindustry/mod/ContentParser.java:1374-1377, 1398-1402

## 两个隐藏行为

**物品和液体会自动加一个「生产出它」的研究目标。** 也就是说，科技树上的物品节点除了交研究费，还要求你实际生产出这个物品才算研究完成——这和原版石墨、钛的行为一致。

Source: 源码和示例/Mindustry/core/src/mindustry/mod/ContentParser.java:1379-1382

**重复写 `research` 会移除旧节点。** 如果同名内容之前已经进过科技树，加载时会先把旧节点删掉再建新节点，所以后加载的 mod 可以用 `research` 改写已有内容的科技树位置。

Source: 源码和示例/Mindustry/core/src/mindustry/mod/ContentParser.java:1358-1361

## 常见坑

1. **父节点名写错或父节点不在科技树里**：游戏不会崩溃，只在日志里警告 `Content 'xxx' isn't in the tech tree...`，内容安静地不进科技树。写完务必开一局战役看研究界面。

   Source: 源码和示例/Mindustry/core/src/mindustry/mod/ContentParser.java:1407-1409

2. **写在自己内容里的内部名**：父节点是自己 mod 的内容时写文件名即可，解析器会自动补 `mod名-` 前缀。

3. **验证过的完整示例**（本章示例 mod，0 错误通过验证器）：

```json
// content/blocks/example-smelter.json
{
  "name": "示例炉",
  "type": "GenericCrafter",
  "size": 2,
  "health": 200,
  "hasItems": true,
  "hasPower": true,
  "itemCapacity": 10,
  "craftTime": 60,
  "outputItem": "example-ingot/1",
  "consumes": {
    "items": ["coal/2"],
    "power": 1.0
  },
  "requirements": ["copper/30", "lead/20"],
  "category": "crafting",
  "research": {
    "parent": "graphite-press",
    "requirements": ["copper/150", "lead/100"]
  }
}
```

注意 `outputItem` 这类 `ItemStack` 类型字段必须写成 `物品名/数量` 格式，只写名字会报 `Unable to convert value to required type: outputItem`——这是本次验证中实际踩到的错。

## 小结

- `research: "父节点名"` 就能进科技树
- 对象形式可自定义 `requirements`（研究消耗）和 `objectives`（研究目标）
- 物品/液体自动附加「生产出它」的目标
- 父节点找不到时静默跳过，只有日志警告
