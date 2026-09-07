# vanilla 组件库


`vanilla/` 模块提供对齐 Mindustry v159.7 原版的 **44 个 Kotlin 组件**（`io.eve.vanilla.comp`），开箱即用：

```
EntityComp  PosComp  TeamComp  HealthComp  HitboxComp  VelComp  RotComp  DrawComp
TimedComp  TimerComp  SyncComp  DamageComp  ShieldComp  StatusComp  ItemsComp
WeaponsComp  BuilderComp  MinerComp  MechComp  LegsComp  CrawlComp  TankComp
WaterMoveComp  WaterCrawlComp  ElevationMoveComp  UnderwaterMoveComp  PhysicsComp
BulletComp  PlayerComp  UnitComp  BuildingComp  BlockUnitComp  ... 等
```

- 组件间依赖通过继承/实现 `*c` 接口表达（如 `UnitComp` 依赖 `Healthc/Physicsc/Hitboxc/Statusc/Teamc/...`）。
- `entity/EntityDefs.kt` 给出两个组装示例：

```kotlin
@EntityDef([PosComp::class, TeamComp::class, HealthComp::class, HitboxComp::class,
           VelComp::class, RotComp::class, DrawComp::class, TimedComp::class])
abstract class UnitDef            // → io.eve.vanilla.gen.Unit

@EntityDef([PosComp::class, HealthComp::class])
abstract class SimpleEntityDef    // → io.eve.vanilla.gen.SimpleEntity

@GroupDef([PosComp::class], spatial = true, mapping = true)
abstract class gpos               // → IndexableEntity__pos
```

- `vanilla` 使用独立 gen 包 `io.eve.vanilla.gen`（同样自备 `EntityInterface.kt`），与 `realmod` 的 `io.eve.ktannot.gen` 互不干扰。
- 注意：`comp/PosTeamDef.kt` 是占位目标定义（残留 `mindustry.annotations.Annotations.*` 引用，当前不参与生成）。

