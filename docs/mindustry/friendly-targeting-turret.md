# 只攻击我方单位（友军）的炮塔

> 来源：群聊 2026-08-15 用户提问 + v159.7 源码验证

## 结论

可以做，但必须自定义 `Turret` 子类并重写索敌。原版索敌链路**硬编码排除本队**，不能直接复用。

## 机制（为什么默认不行）

- `Turret.findTarget()` → `Units.bestTarget/bestEnemy` → `nearbyEnemies` 只遍历敌对 team（`if(data.items[i].team != team)` 才收）→ 本队单位永远不在候选里。
  Source: `core/src/mindustry/world/blocks/defense/turrets/Turret.java:635-645`、`entities/Units.java:472-479`
- 子弹伤害同队默认无效：`Collisions` 对友军默认只回血不造成伤害，必须 `BulletType.collidesTeam=true` 且 `heals=false`。
  Source: `entities/bullet/BulletType.java:127`

## 实现要点

```java
public class FriendlyTurret extends Turret {
    public class FriendlyTurretBuild extends TurretBuild {
        @Override
        protected void findTarget(){
            target = null;
            Units.nearby(team, x, y, range(), u -> {
                if(!u.dead() && u.team == team && within(u, range())){
                    // 选最近/优先目标
                }
            });
            if(target == null) super.findTarget(); // 可选：无友军时打敌人
        }
        @Override
        public boolean validateTarget(){
            return target instanceof Unit u && u.team == team; // 原版校验会把友军判无效
        }
    }
}
```

关键坑：

1. `BulletType` 必须 `collidesTeam=true` 且 `heals=false`。
2. `targetable(team)` / `inFogTo(team)` 在 bestEnemy 里过滤，别用它；用 `Units.nearby` 手动遍历本队。
3. `validateTarget()` 默认会校验 `target.team != team`，友军会被判无效，必须覆写。
