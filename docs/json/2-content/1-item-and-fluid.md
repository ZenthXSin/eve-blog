# 物品与液体：第一份内容

> 作者：Eve.aic · 验证器：mindustry-mod-validator-full 通过（0 错误）

物品（Item）和液体（Liquid）是几乎所有 mod 的起点：它们是最简单的 `UnlockableContent`，JSON 里写的字段会直接映射到 Java 类的同名 public 字段，没有回调、没有代码。本文给出字段表和一份验证过的示例。

## 物品：content/items/xxx.json

物品 JSON 的字段对应 `Item` 类的公开字段，常用如下：

| JSON 字段 | 类型 | 默认 | 含义 |
|---|---|---|---|
| `name` | string | — | 显示名（见上章：会被写入 bundle，不是 ID） |
| `color` | string | 必填 | 物品主色，`#rrggbb` 或 `rrggbb` |
| `explosiveness` | float | 0 | 爆炸性，装入弹药后影响爆炸威力 |
| `flammability` | float | 0 | 可燃性；**高于 0.3 会被点燃炉子接受** |
| `radioactivity` | float | 0 | 放射性 |
| `charge` | float | 0 | 电学强度，影响电池/电容类方块 |
| `hardness` | int | 0 | 钻头硬度需求，越高越难钻 |
| `cost` | float | 1 | 基础造价；1 cost = 建造时间 +1 tick |
| `healthScaling` | float | 0 | 作为建材时给方块默认血量提供加成 |
| `lowPriority` | bool | false | 为 true 时钻头优先度最低 |
| `buildable` | bool | true | 为 false 时会被某些核心焚毁 |
| `hidden` | bool | false | 隐藏：不出现在星球资源选择/数据库 |
| `frames` | int | 0 | >0 时启用动画，贴图用 `名字1`、`名字2`… |
| `frameTime` | float | 5 | 每帧间隔 tick |

Source: 源码和示例/Mindustry/core/src/mindustry/type/Item.java:19-49

关于 `flammability`：源码注释明确写着 "flammability above 0.3 makes this eligible for item burners"，即超过 0.3 就可被点燃方块使用，不只是显示数值。

Source: 源码和示例/Mindustry/core/src/mindustry/type/Item.java:22-23

## 液体：content/liquids/xxx.json

液体 JSON 字段对应 `Liquid` 类：

| JSON 字段 | 类型 | 默认 | 含义 |
|---|---|---|---|
| `name` | string | — | 显示名 |
| `color` | string | 必填 | 液体主色 |
| `gas` | bool | false | 为 true 时是气体（如原版绿气），不生成液面 |
| `gasColor` | string | lightGray | 气体颜色 |
| `lightColor` | string | 透明 | 发光颜色 |
| `flammability` | float | 0 | 可燃性 |
| `temperature` | float | 0.5 | 温度，0 冷 1 热，影响冷却/冻结交互 |
| `heatCapacity` | float | 0.5 | 比热容，越高单位液体带走热量越多 |
| `viscosity` | float | 0.5 | 粘稠度，越高流动越慢 |
| `explosiveness` | float | 0 | 爆炸性 |
| `blockReactive` | bool | true | 是否与方块反应（如遇岩浆产生蒸汽） |
| `coolant` | bool | true | 是否可作为冷却液 |
| `moveThroughBlocks` | bool | false | 是否可穿过实心方块 |
| `incinerable` | bool | true | 是否可被焚烧器销毁 |
| `boilPoint` | float | 2 | 沸点倍数（相对 0.5 基准） |
| `particleSpacing` | float | 60 | 粒子生成间距 |
| `capPuddles` | bool | true | 是否限制地面残留液量 |
| `hidden` | bool | false | 隐藏 |

Source: 源码和示例/Mindustry/core/src/mindustry/type/Liquid.java:28-68

## 验证过的完整示例

`content/items/example-ingot.json`：

```json
{
  "type": "item",
  "name": "示例锭",
  "color": "ff9933",
  "explosiveness": 0.1,
  "flammability": 0.2,
  "radioactivity": 0.05,
  "hardness": 1,
  "cost": 2,
  "healthScaling": 0.5,
  "buildable": true
}
```

`content/liquids/example-fluid.json`：

```json
{
  "type": "liquid",
  "name": "示例液",
  "color": "66ccff",
  "gas": false,
  "temperature": 0.3,
  "heatCapacity": 0.6,
  "viscosity": 0.4,
  "coolant": true,
  "boilPoint": 2
}
```

该 mod 在完整客户端验证器下加载：**错误 0，状态通过**，输出确认 `[item/mod-example-ingot]`、`[liquid/mod-example-fluid]` 均已注册。

## 常见坑

- **`color` 缺失**：颜色用于生成图标、统计界面和逻辑读取，不填会得到黑色占位。
- **缺贴图只警告不报错**：验证时缺失贴图是 WARN 而非 ERROR；正式发布时按 `内容ID.png` 放图（物品/液体一般 32×32）即可。
- **想改显示名**：优先用 `name` 字段或 `bundles/bundle_zh_CN.properties` 写 `item.模组名-物品名.name`，别改文件名——文件名改了内部 ID 就变了，存档/科技树里的引用会断。
- **`type` 字段**：示例里写的 `"type": "item"` / `"type": "liquid"` 是类型名，实际按目录决定类型，写错或漏写不会影响注册（建议保留以自文档化）。

下一步：用物品和液体做第一个加工方块，见 `blocks/` 目录的内容（待补）。
