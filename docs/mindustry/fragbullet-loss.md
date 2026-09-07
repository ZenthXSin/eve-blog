# 高版本 fragBullet 丢失原因（多道门禁）

> 来源：群聊 2026-08-15 + v159.7 源码验证

v7 build 136+（尤其 v8/159）把碎片生成从「有 fragBullet 就出」改成了多道门禁，任一不过就丢：

1. **`fragOnHit`**（v136 引入，默认 true）：命中才出；原版已有关闭例子 `Blocks.java:5044`、`UnitTypes.java:2897`。
2. **`fragOnAbsorb`**（v140 引入，默认 true）：被力场盾/盾弧吸收的子弹（`b.absorb()` 置 `absorbed=true`）默认不再出碎片；设 false 就全丢。
3. **`pierceFragCap` + `b.frags` 计数**（v8 引入）：穿透弹每出一次碎片 +1，达到上限后停（原版 `UnitTypes.java:2898` 就是 1）。
4. **despawn 路径重构**（v8）：以前 `despawned()` 走 `hit()` 出碎片；现在 `despawned()` 调 `hit(b,x,y,false)` 强制不出，改由 `removed()` 里 `b.frags==0 && fragOnDespawn` 补发——命中过（frags>0）或 `fragOnDespawn=false`（`UnitTypes.java:3891`）就再也不补。
5. **`delayFrags` 需父子弹同时设** 才延迟到下一帧，只设一边行为不同。
6. **共享 fragBullet 被强制改写**：`update()` 每帧把 `fragBullet.keepVelocity=false; scaleKeepVelocity=false`（`BulletType.java:837-839`），多个父弹共用同一碎片类型会互相污染；碎片速度/寿命随机，可能秒死或定身，看着像「丢失」。

## 排查清单

- 碎片没出 → 先查 `fragOnHit`（有没有命中）→ `fragOnAbsorb`（是不是被盾吸收）→ `pierceFragCap`（穿透次数是否到顶）
- 只在消失时不出 → 查 despawn 路径：是否命中过（frags>0）、`fragOnDespawn` 是否 true
- 时有时无 → 查是否多个父弹共用同一 fragBullet 类型（共享污染）

## Source

`core/src/mindustry/entities/bullet/BulletType.java:181-185,202-220,549-563,614-623,637-659,837-839`
`core/src/mindustry/entities/comp/BulletComp.java:83-91,100-103`
`core/src/mindustry/entities/abilities/ForceFieldAbility.java:47`、`ShieldArcAbility.java:55`
`core/src/mindustry/content/Blocks.java:5044`、`UnitTypes.java:2897-2898,3891`
