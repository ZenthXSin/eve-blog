# 第一个方块：GenericCrafter 加工方块

> 本文示例 JSON 已通过 mindustry-mod-validator-full 实机加载验证（0 错误）。基线：原版 v159.7。

加工方块（熔炉、粉碎机、石墨压机……）在源码里基本都是 `GenericCrafter` 的实例：消耗原料（物品/液体/电力），过 `craftTime` 后产出物品或液体。

Source: core/src/mindustry/world/blocks/production/GenericCrafter.java:22（类定义）

## 最小可用示例

`content/blocks/coal-press.json`（文件名即内部名，最终 ID 为 `mod名-coal-press`）：

```json
{
  "name": "Coal Press",
  "type": "GenericCrafter",
  "size": 2,
  "hasPower": true,
  "consumes": {
    "items": {"items": [{"item": "sand", "amount": 3}]},
    "power": 0.5
  },
  "requirements": [
    {"item": "copper", "amount": 60},
    {"item": "lead", "amount": 45}
  ],
  "category": "crafting",
  "craftTime": 40,
  "outputItem": {"item": "coal", "amount": 1}
}
```

效果：每秒消耗 3 沙子 + 0.5 电力，40 tick（2/3 秒）产 1 煤。

## 字段对照源码

| JSON 字段 | 源码字段 | 说明 |
| --- | --- | --- |
| `type: "GenericCrafter"` | `GenericCrafter` | 加工方块基类；构造函数默认 `update/solid/hasItems = true`，不用手写（Source: GenericCrafter.java:51-60） |
| `size` | `Block.size` | 占格边长（Source: core/src/mindustry/world/Block.java:215） |
| `requirements` | `Block.requirements` | 建造成本，`ItemStack[]`（Source: Block.java:356） |
| `category` | `Block.category` | 建造菜单分类（Source: Block.java:358） |
| `craftTime` | `GenericCrafter.craftTime` | 单次加工 tick 数，默认 80；统计面板按 `craftTime/60` 秒显示（Source: GenericCrafter.java:40、69） |
| `outputItem` | `GenericCrafter.outputItem` | 单物品产出；初始化时自动包成 `outputItems` 数组（Source: GenericCrafter.java:25、120-121） |
| `outputItems` | `GenericCrafter.outputItems` | 多物品产出，写了会覆盖 `outputItem`（Source: GenericCrafter.java:27） |
| `outputLiquid` | `GenericCrafter.outputLiquid` | 液体产出，`{"liquid": "water", "amount": 0.1}` 这种 `LiquidStack` |

## consumes 怎么写

`consumes` 是对象，每个 key 走 `ContentParser.readBlockConsumers` 的 switch 分发（Source: core/src/mindustry/mod/ContentParser.java:598-600 触发解析，542-571 各分支）：

- `"items"`：数组 `["sand/3"]` 或 `ItemStack[]`，也可写 `{"items": [...]}` 对象形式（Source: ContentParser.java:550-553）
- `"item"`：单物品简写，如 `"item": "coal"`（Source: ContentParser.java:542）
- `"liquid"` / `"liquids"`：液体消耗（Source: ContentParser.java:557-560）
- `"power"`：数值 = 每秒电耗；`"powerBuffered"` = 电容式（Source: ContentParser.java:564、571）

## 常见坑

1. **不写 `outputItem` 就没产出**——`outputItems` 为 null 时 crafter 只消耗不产出（Source: GenericCrafter.java:25-27）。
2. **`craftTime` 单位是 tick，不是秒**——每秒 60 tick，UI 里显示的秒数是 `craftTime/60`。
3. **缺贴图只是 WARN**：`<mod名>-<内容名>.png` 缺失时内容照常加载，用占位图显示；验证器会给 `[missing-sprite]` 警告，不影响功能。
4. **液体输出方向**默认 `liquidOutputDirections = {-1}`，即向四周平均分配（Source: GenericCrafter.java:31）。

## 验证方式

把示例放进 mod 的 `content/blocks/`，用 `mindustry-mod-validator-full/run-full.sh <mod目录>` 实机加载，看 `errors` 是否为 0。本文示例验证结果：`"errors": 0`，仅有缺贴图与可选字段未初始化的 WARN。
