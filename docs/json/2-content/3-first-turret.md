# 第一座炮塔：ItemTurret 与子弹定义

> 作者：Eve.aic · 本文示例 JSON 已通过 mindustry-mod-validator-full 实机加载验证（status: passed，0 错误）。基线：原版 v159.7。

加工方块（GenericCrafter）只能生产，要防家还得有炮塔。原版最典型的物品炮塔（duo、scatter、hail、ripple）都是 `ItemTurret` 的实例：吃弹药物品，按物品对应的子弹类型开火。

Source: core/src/mindustry/world/blocks/defense/turrets/ItemTurret.java:23（类定义）

## 最小可用示例

`content/blocks/peashooter.json`：

```json
{
  "name": "Peashooter",
  "type": "ItemTurret",
  "size": 1,
  "health": 400,
  "reload": 15,
  "range": 140,
  "inaccuracy": 3,
  "maxAmmo": 20,
  "ammoPerShot": 1,
  "requirements": [
    {"item": "copper", "amount": 50},
    {"item": "lead", "amount": 25}
  ],
  "category": "turret",
  "research": "duo",
  "ammoTypes": {
    "copper": {
      "type": "BasicBulletType",
      "speed": 2.5,
      "damage": 9,
      "width": 7,
      "height": 9,
      "lifetime": 60,
      "ammoMultiplier": 2
    },
    "graphite": {
      "type": "BasicBulletType",
      "speed": 3.5,
      "damage": 18,
      "width": 9,
      "height": 12,
      "lifetime": 60,
      "ammoMultiplier": 4,
      "reloadMultiplier": 0.8,
      "rangeChange": 16
    }
  }
}
```

效果：一座 1×1 炮塔，可装铜或石墨当弹药，铜弹 9 伤害，石墨弹 18 伤害但装填慢 20%、射程 +16。

## 字段对照源码

| JSON 字段 | 源码字段 | 说明 |
| --- | --- | --- |
| `type: "ItemTurret"` | `ItemTurret` | 类名映射注册在 ClassMap（Source: core/src/mindustry/mod/ClassMap.java:198） |
| `reload` | `ReloadTurret.reload = 10f` | 装填所需 tick 数，越小射速越快；UI 射速按 `60 / reload × 每次弹数` 显示（Source: core/src/mindustry/world/blocks/defense/turrets/ReloadTurret.java:10、core/src/mindustry/world/blocks/defense/turrets/Turret.java:183） |
| `range` | `Turret` 射程 | 单位是**世界单位**，8 世界单位 = 1 格，所以 140 ≈ 17.5 格 |
| `inaccuracy` | `Turret.inaccuracy` | 子弹随机偏转角，单位度（Source: Turret.java:58 附近，`inaccuracy` 字段注释 "Bullet angle randomness in degrees"） |
| `maxAmmo` | `Turret.maxAmmo = 30` | 弹仓容量（Source: Turret.java:47） |
| `ammoPerShot` | `Turret.ammoPerShot = 1` | 每发消耗几单位弹药（Source: Turret.java:49） |
| `research` | — | 科技树父节点，写在 JSON 里会被 `readFields` 单独取出挂到科技树（Source: core/src/mindustry/mod/ContentParser.java:1272） |
| `ammoTypes` | `ItemTurret.ammoTypes` | 物品 → 子弹类型的映射表（Source: ItemTurret.java:24，`ObjectMap<Item, BulletType>`） |

`ammoTypes` 的 key 是物品内部名（原版物品直接写 `copper` 这种），value 就是一个子弹定义对象。炮塔只吃表里的物品——源码里就是一张过滤表 `ammoTypes.containsKey(i)`（Source: ItemTurret.java:72）。

## 子弹（BulletType）常用字段

子弹默认按 `BasicBulletType` 解析，子弹 JSON 里的 `type` 还可以写 `"FlakBulletType"` 等，解析逻辑会自动尝试 `XxxBulletType` 的类名（Source: core/src/mindustry/mod/ContentParser.java:185-190）。

| 字段 | 源码 | 说明 |
| --- | --- | --- |
| `speed` | `BulletType.speed = 1f` | 初速，世界单位/tick（Source: core/src/mindustry/entities/bullet/BulletType.java:37） |
| `damage` | `BulletType.damage = 1f` | 命中伤害（Source: BulletType.java:41） |
| `lifetime` | `BulletType.lifetime = 40f` | 存活 tick 数；**实际射程 ≈ speed × lifetime ÷ 8 格**（Source: BulletType.java:33） |
| `width` / `height` | `BasicBulletType` | 子弹贴图尺寸，默认 5×7（Source: core/src/mindustry/entities/bullet/BasicBulletType.java:15） |
| `ammoMultiplier` | `BulletType.ammoMultiplier = 2f` | 1 单位物品算几发弹药（Source: BulletType.java:95） |
| `reloadMultiplier` | `BulletType.reloadMultiplier = 1f` | 这种弹药的装填倍率，0.8 = 慢 25%（Source: BulletType.java:97） |
| `rangeChange` | `BulletType.rangeChange = 0f` | 装这种弹药时炮塔射程增减（Source: BulletType.java:157） |
| `buildingDamageMultiplier` | 默认 1 | 对建筑伤害倍率，想限制拆家就调低（Source: BulletType.java:99） |

## 常见坑

1. **炮塔不开火先查弹药**：`ammoTypes` 的 key 必须是已存在的物品内部名，写错名字会在加载期就报内容找不到，不会静默失败。
2. **射程对不上**：`range` 是世界单位不是格子数；子弹的 `lifetime × speed` 如果小于炮塔 `range`，会出现"看得见打不着"。
3. **`research` 写父节点**：写 `"research": "duo"` 表示在 duo 之后解锁；不写就进不了科技树。
4. **弹药越贵不一定越强**：原版 duo 的铜/石墨/硅就是现成的权衡样例——铜均衡、石墨高伤慢射、硅追踪（Source: core/src/mindustry/content/Blocks.java:3258-3290，duo 的三种弹药定义）。

## 小结

- 物品炮塔 = `ItemTurret` + `ammoTypes` 物品→子弹映射
- 炮塔本体管射速/射程/弹仓，子弹管伤害/速度/存活时间
- 验证：把 mod 丢进 mindustry-mod-validator-full，确认 status: passed、0 错误再发布
