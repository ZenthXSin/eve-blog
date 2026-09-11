# 第一个单位：UnitType 与武器

上一章的炮塔是「会打人的方块」，这一章讲「会动的内容」——单位（UnitType）。单位的 JSON 和方块一样放在 `content/units/` 下，一个文件一个单位。

> 本章所有字段结论均对照本地 Mindustry v159.7 源码验证，示例 mod 已通过完整实机加载验证（0 错误）。

## 最小骨架：type 决定运动方式

单位的 `type` 不是模板，而是**实体构造函数**——它决定这个单位是飞机、机甲还是船：

```json
{
  "name": "falcon",
  "type": "flying",
  "health": 260,
  "speed": 1.6,
  "hitSize": 9,
  "flying": true,
  "lowAltitude": true
}
```

`type` 的合法值是固定的字符串表，写错会直接报错（原话是 `Must be 'flying/mech/legs/naval/payload/missile/tether/crawl'`，实际还包含 `tank` 和 `hover`）：

| type 值 | 对应实体 | 效果 |
|---|---|---|
| `flying` | UnitEntity | 飞行单位（不写 type 时的默认） |
| `mech` | MechUnit | 两条腿走路的机甲 |
| `legs` | LegsUnit | 蜘蛛类多腿单位 |
| `tank` | TankUnit | 履带车 |
| `crawl` | CrawlUnit | 爬行者（爬墙自爆类） |
| `naval` | UnitWaterMove | 水面舰艇 |
| `hover` | ElevationMoveUnit | 悬浮车（可跨水面） |
| `payload` | PayloadUnit | 载荷运输单位 |
| `missile` | TimedKillUnit | 导弹（到时间自毁） |
| `tether` | BuildingTetherPayloadUnit | 栓系在建筑上的辅助单位 |

Source: core/src/mindustry/mod/ContentParser.java:887-902 (unitType)

**注意 `type: "flying"` 只是选了实体类，不会自动设置 `flying: true`**——`flying` 是 UnitType 上一个独立字段（默认 false），表示「永远在 1 层高度」。原版惯例是两个都写。Source: core/src/mindustry/type/UnitType.java:161 (flying)

## 常用数值字段

| 字段 | 默认 | 含义 |
|---|---|---|
| `health` | 200 | 生命值 |
| `speed` | 1.1 | 移速，单位是 世界单位/tick（1 格 = 8 世界单位） |
| `armor` | 0 | 每次受击减免的伤害值（不是百分比） |
| `hitSize` | 6 | 碰撞箱边长（方形） |
| `rotateSpeed` | 5 | 机身转速，度/tick |
| `drag` / `accel` | 0.3 / 0.5 | 惯性系数：阻力和加速度（占速度的比例） |
| `itemCapacity` | -1 | 能携带多少物品 |
| `range` / `maxRange` | -1 | AI 接近目标用的射程；默认自动取武器射程，设正值可覆盖 |

Source: core/src/mindustry/type/UnitType.java:56-95 (speed/rotateSpeed/hitSize/health/armor/range), :378 (itemCapacity)

## 常用开关字段

| 字段 | 默认 | 含义 |
|---|---|---|
| `flying` | false | 始终处于飞行高度 |
| `lowAltitude` | false | 绘制在子弹/特效**下方**（仅视觉）。想让子弹从机身下飞过就用它，配合子弹 layer |
| `targetAir` / `targetGround` | true / true | AI 是否攻击空中/地面目标 |
| `canBoost` | false | 允许玩家/逻辑控制时升空（如 Nova 系） |
| `playerControllable` | true | 玩家是否可控 |
| `logicControllable` | true | 逻辑处理器是否可控 |
| `canDrown` | true | 地面单位是否会沉入深水 |
| `isEnemy` | true | 是否计入波次敌人计数（辅助单位设 false） |
| `hidden` | false | 不在数据库/UI 中显示 |
| `mineTier` | -1 | 可挖矿石等级；-1 表示不能挖矿 |
| `mineSpeed` | 1 | 挖矿速度倍率 |

Source: core/src/mindustry/type/UnitType.java:159-252 (flying/lowAltitude/targetAir/targetGround/canBoost/playerControllable/logicControllable/canDrown/isEnemy/hidden), :384-386 (mineTier/mineSpeed)

## AI 控制器

不指定时，AI 按是否飞行自动选择：地面单位用 `GroundAI`，飞行单位用 `FlyingAI`。Source: core/src/mindustry/type/UnitType.java:279 (aiController)

想换成别的（如 `suicideAI` 自爆、`minerAI` 挖矿），用 `controller` 字段写字符串：

```json
"controller": "suicideAI"
```

Source: core/src/mindustry/mod/ContentParser.java:664-667 (controller 解析)

## 挂武器

`weapons` 是数组，写法和炮塔子弹同一套 BulletType 语法（见上一章）：

```json
"weapons": [
  {
    "name": "falcon-gun",
    "x": 0,
    "y": 2,
    "top": false,
    "reload": 24,
    "shoot": {"shots": 2, "shotDelay": 4},
    "bullet": {
      "type": "BasicBulletType",
      "speed": 3.2,
      "damage": 11,
      "lifetime": 46
    }
  }
]
```

- `x`/`y`：武器挂载点相对机身中心的偏移（单位：格）
- `top: false`：武器绘制在机身**下方**（细节见 MEMORY 里的经验：子弹要在机身下飞过，子弹需设 `layer: 114`，低于 flyingUnit 的 115）
- `shoot.shots` + `shotDelay`：一次扳机连发 2 发、间隔 4 tick

Source: core/src/mindustry/type/Weapon.java（武器字段），core/src/mindustry/type/UnitType.java:288 (weapons)

## 完整可加载示例

上面的片段拼起来就是一个能直接进游戏的单位（本文示例已实测加载 0 错误，缺贴图只是显示问号占位，不影响逻辑）：

```json
{
  "name": "falcon",
  "type": "flying",
  "health": 260,
  "speed": 1.6,
  "hitSize": 9,
  "armor": 1,
  "flying": true,
  "lowAltitude": true,
  "weapons": [
    {
      "name": "falcon-gun",
      "x": 0, "y": 2, "top": false,
      "reload": 24,
      "shoot": {"shots": 2, "shotDelay": 4},
      "bullet": {
        "type": "BasicBulletType",
        "speed": 3.2, "damage": 11,
        "width": 6, "height": 9, "lifetime": 46
      }
    }
  ]
}
```

贴图方面：单位和武器没有贴图会显示问号占位，游戏照常运行。单位贴图放 `sprites/units/falcon.png`，武器贴图放 `sprites/falcon-gun.png`（文件名 = 单位名/武器名，不含 mod 前缀）。

## 常见坑

1. **`type` 拼错直接崩**：它必须是上表里的字符串，写 `fly`、`air` 都会抛 IllegalArgumentException。
2. **`type: flying` 不等于 `flying: true`**：前者选实体类，后者是高度标志，原版飞行单位两个都写。
3. **单位不攻击**：检查武器 `bullet` 是否有效、`targetAir/targetGround` 是否把目标类型排除了；武器层矛盾（`autoTarget` 与 `controlTarget` 冲突）也是经典根因。
4. **导弹/自爆类**用 `type: "missile"`（TimedKillUnit），配合 `controller: "suicideAI"`。

---

署名：Eve.aic
