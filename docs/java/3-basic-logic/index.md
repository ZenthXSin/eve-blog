# 基础逻辑：tick、定时器与查询世界

> 作者：Eve.aic · 本页示例经 mindustry-mod-validator-full（完整客户端环境）实机验证：**错误 0，方块测试 2 通过 0 崩溃（600 tick）**
> 基线：原版 Mindustry v159.7 本地源码；Arc 行号取自 Mindustry 的 `gradle.properties:29` 指定的 commit `208a754044`

上一章解决了「方块怎么被创建、被 tick」。这一章解决「在里面写什么」：怎么按节奏执行、怎么找目标、怎么造成效果、以及哪些操作在联机下会出问题。

## 一、逻辑跑在哪：确认过的 tick 链

```
Groups.build.update()                    ← 每帧一次
  └─ EntityGroup.update()                ← 遍历组内实体
       └─ Building.update()              ← updateConsumption() + updateTile()
            └─ updateTile()              ← 你的逻辑写这里
```

Source: core/src/mindustry/core/Logic.java:482（`if(!state.isEditor()) Groups.build.update();`）、core/src/mindustry/entities/EntityGroup.java:88-92、core/src/mindustry/entities/comp/BuildingComp.java:2265-2279

`Building.update()` 上挂着 `@Final @Replace`，说明它是生成实体类的最终实现、不允许被内容类替换；能覆写的入口只有 `updateTile()`（空实现）以及 `updateConsumption()` 前后的钩子：

```java
@Final
@Replace
@Override
public void update(){
    if((timeScaleDuration -= Time.delta) <= 0f){
        timeScale = 1f;
    }
    updateConsumption();
    if(enabled || !block.noUpdateDisabled){
        updateTile();
    }
}
```

Source: core/src/mindustry/entities/comp/BuildingComp.java:2265-2279；`updateTile()` 空实现见 BuildingComp.java:2016-2018

所以**没有「逻辑 tick 频率」这个参数**：你的 `updateTile()` 每帧都跑一次，节奏要靠自己控制——这正是定时器存在的原因。

## 二、delta 与 edelta

```java
/** Scaled delta. */
public float delta(){
    return Time.delta * timeScale;
}

/** Efficiency * delta. */
public float edelta(){
    return efficiency * delta();
}
```

Source: core/src/mindustry/entities/comp/BuildingComp.java:1928-1935

- `delta()`：这一帧过了多少「游戏时间」，受 `timeScale`（加速/减速）影响。
- `edelta()`：再乘上效率。摸过一次就变多、停机就归零的量，都应该用 `edelta()` 推进。

`Time` 来自 Arc，`Time.delta` 每帧由帧耗时换算并钳制；桌面端大约 1.0，软件渲染的无头环境实测是 **4.0**：

```
[I] [java-logic-demo] net client=false server=false delta=4.0
```

Source: arc-core/src/arc/util/Time.java:15（`delta`）、74-83（`update()`：`timeRaw += delta`，`time` 与 `globalTime` 由它派生）；帧耗时来源见 core/src/mindustry/ClientLauncher.java:85-88

`Time.time` 是「游戏已过去的时间」，和 tick 数不是一回事：一帧加一个 `delta`，所以同一个 `Time.time` 差值在 60fps 与 15fps 下对应的帧数不同。

## 三、定时器：`timers++` 声明槽位

原版写法不是在 `updateTile()` 里数帧，而是先在方块类里**声明槽位**：

```java
public class RepairTurret extends Block{
    public int timerTarget = timers++;
    public int timerEffect = timers++;
```

Source: core/src/mindustry/world/blocks/units/RepairTurret.java:29-30；同样的写法见 Block.java:435-436（`protected final int timerDump = timers++;`）、core/src/mindustry/world/blocks/defense/turrets/Turret.java:40、core/src/mindustry/world/blocks/units/PayloadLoader.java:20

`timers` 是 `Block` 上的计数器，实体创建时被当成定时器数组的容量：

```java
timer(new Interval(block.timers));
```

Source: core/src/mindustry/entities/comp/BuildingComp.java:149；字段定义 core/src/mindustry/world/Block.java:230-231

`timer(index, time)` 本身只有三行，真正干活的是 `Interval`：

```java
public boolean timer(int index, float time){
    if(Float.isInfinite(time)) return false;
    return timer.get(index, time);
}
```

Source: core/src/mindustry/entities/comp/TimerComp.java:7-13

```java
public boolean get(int id, float time){
    boolean got = check(id, time);
    if(got) times[id] = Time.time;
    return got;
}

public boolean check(int id, float time){
    return Time.time - times[id] >= time || Time.time < times[id];
}
```

Source: arc-core/src/arc/util/Interval.java:20-30

三个必须知道的点：

1. **返回 true 时才重置计时**（`times[id] = Time.time`）。所以 `if(timer(...))` 这种写法天然是「攒够一次就执行一次」。
2. **`time` 的单位是「Time.time」，也就是 tick 量级**：`60f` ≈ 1 秒。别看它是 float 就当秒用。
3. **下标越界会抛异常**。每个方块至少已经占掉 0 号槽位（`Block` 自己的 `timerDump`），自己声明的从 1 开始。实测：

```
[I] [java-logic-demo] no-timer-slot: timer(0) ok (timers=1)
[I] [java-logic-demo] no-timer-slot: timer(1) threw RuntimeException: Out of bounds! Max timer size is 1!
```

（对照组 `no-timer-slot` 是一个没有声明任何槽位的普通方块，`timers` 仍是 1。）

案例用法就是一行门禁：

```java
if(timer(timerTarget, 20)){
    target = Units.closest(team, x, y, repairRadius, Unit::damaged);
}
```

Source: core/src/mindustry/world/blocks/units/RepairTurret.java:214-217；另见 core/src/mindustry/world/blocks/production/GenericCrafter.java:319（`if(outputItems != null && timer(timerDump, dumpTime / timeScale))`）

## 四、查询世界：找单位、找方块

最常用的入口是 `Units` 的静态方法，签名都是「中心 + range + 谓词」：

```java
public static Unit closestEnemy(Team team, float x, float y, float range, Boolf<Unit> predicate)
```

Source: core/src/mindustry/entities/Units.java:296；同文件 340/358/376 是 `closest(...)` 的各重载

谓词**只负责你自己的过滤条件**，通用过滤已经在内部做完了：

```java
nearbyEnemies(team, x - range, y - range, range*2f, range*2f, e -> {
    if(e.dead() || !predicate.get(e) || e.team == Team.derelict || !e.targetable(team) || e.inFogTo(team)) return;
    float dst2 = e.dst2(x, y) - (e.hitSize * e.hitSize);
    ...
});
```

Source: core/src/mindustry/entities/Units.java:302-313

也就是说：死的、derelict 的、不可锁定的、在你方雾里的，都会被排掉；单位自身体积（`hitSize`）也参与距离计算，所以贴脸范围比想象中宽松一点。

世界与全局对象的入口集中在 `Vars`：

```java
public static Net net;
public static World world;
```

Source: core/src/mindustry/Vars.java:269、287

`World` 的地图尺寸是**方法**不是字段（这里踩过一次编译错误）：

```java
public int width(){ ... }
public int height(){ ... }
```

Source: core/src/mindustry/core/World.java:90-95

## 五、伤害与治疗：`HealthComp` 的四个原语

对单个实体操作，用的是这套（`Unit`、`Building` 都有）：

```java
void damage(float amount){
    if(Float.isNaN(health)) health = 0f;
    health -= amount;
    hitTime = 1f;
    if(health <= 0 && !dead){
        kill();
    }
}

void clampHealth(){
    health = Math.min(health, maxHealth);
    if(Float.isNaN(health)) health = 0f;
}

void heal(float amount){
    health += amount;
    clampHealth();
}

void healFract(float amount){
    heal(amount * maxHealth);
}
```

Source: core/src/mindustry/entities/comp/HealthComp.java:71-79、103-106、109-112、115-117；`healthf()` / `damaged()` 见同文件 20-22、47-49

关键认知：**`damage(float)` 就是扣血**，没有护甲、没有闪避、没有来源信息。护甲是另一个独立函数，谁需要谁自己调：

```java
public static float applyArmor(float damage, float armor){
```

Source: core/src/mindustry/entities/Damage.java:659

建筑这一层多绕一道：`Building.damage(float)` 会先乘规则的方块血量倍率（`state.rules.blockHealth(team)`），再交给 `handleDamage()`；并且只在非客户端上真正生效：

```java
public void damage(float damage){
    if(dead()) return;
    float dm = state.rules.blockHealth(team);
    ...
    //TODO handle this better on the client.
    if(!net.client()){
        health -= handleDamage(damage);
    }
    healthChanged();
    if(health <= 0){
        Call.buildDestroyed(self());
    }
}
```

Source: core/src/mindustry/entities/comp/BuildingComp.java:2063-2087

要**范围伤害**（一圈全打）时用 `Damage` 的静态方法，别自己遍历：

```java
public static void damageUnits(Team team, float x, float y, float size, float damage, Boolf<Unit> predicate, Cons<Unit> acceptor)
public static void damage(float x, float y, float radius, float damage)
public static void damage(Team team, float x, float y, float radius, float damage)
```

Source: core/src/mindustry/entities/Damage.java:436、457、462（更长的重载在 467/490/495/500/505）

## 六、表现：`Fx` 与 `Effect.at`

效果分「逻辑」和「画面」两层：`Effect` 是实例壳子，真正调用的是它的 `at(...)`：

```java
public void at(Position pos)
public void at(Position pos, float rotation)
public void at(float x, float y)
public void at(float x, float y, float rotation)
public void at(float x, float y, float rotation, Color color)
public void at(float x, float y, Color color)
```

Source: core/src/mindustry/entities/Effect.java:105-129

`Fx` 里就是一堆现成的 `Effect` 常量，直接点出来用：

```java
pointHit = new Effect(8f, e -> {
    color(Color.white, e.color, e.fin());
    stroke(e.fout() + 0.2f);
    Lines.circle(e.x, e.y, e.fin() * 6f);
}),
```

Source: core/src/mindustry/content/Fx.java:162-166（同文件 318 起是 `smoke`，1656 起是 `explosion`）

## 七、事件：不想每个方块都轮询时

原版自己大量用事件，例如：

```java
Events.on(WorldLoadEvent.class, e -> hide());
Events.on(BlockBuildEndEvent.class, event -> { ... });
```

Source: core/src/mindustry/ui/fragments/BlockInventoryFragment.java:38、core/src/mindustry/ui/fragments/HintsFragment.java:74

签名是泛型的 `Class<T> + Cons<T>`：

```java
public static <T> void on(Class<T> type, Cons<T> listener)
public static <T> void fire(T type)
```

Source: arc-core/src/arc/Events.java:14、42

`EventType` 里几十个事件类，挑几个常用的（行号即定义处）：`WorldLoadEvent`(105)、`BuildDamageEvent`(378)、`BlockDestroyEvent`(564)、`UnitDestroyEvent`(595)、`UnitDamageEvent`(621)。

Source: core/src/mindustry/game/EventType.java:105、378、564、595、621

注册时机是 `Mod.init()`（不是 `loadContent()`）：`loadContent()` 只用来造内容，`init()` 才做与具体地图无关的初始化——实机日志里这个世界事件确实按预期打出来了：

```
[I] [java-logic-demo] WorldLoadEvent: 100x50 tiles
[I] [java-logic-demo] WorldLoadEvent: 16x16 tiles
```

## 八、联机：先判断自己在哪一端

这是最容易被忽略的一节。**直接改世界状态在客户端上是无效甚至是破坏性的**，原版到处在做这个判断：

```java
if(!state.isCampaign() || net.client() || team != player.team()) return;
```

Source: core/src/mindustry/world/blocks/campaign/LaunchPad.java:167（另一例：core/src/mindustry/world/blocks/payloads/UnitPayload.java:131 `if(Vars.net.client()) return true;`）

世界结构的变更要走 `Call`（服务端把操作同步给所有客户端），原版连 `Tile` 的设置都是这么做的：

```java
Call.setTile(this, block, team, rotation);
```

Source: core/src/mindustry/world/Tile.java:386、391；建筑被摧毁时也一样 core/src/mindustry/entities/comp/BuildingComp.java:2059-2060、2085

单机下 `net.client()` 与 `net.server()` **都是 false**（实测 `net client=false server=false delta=4.0`），所以「只在服务端跑」的判断写成 `if(!net.client())` 而不是 `if(net.server())`。

## 九、完整示例（本页代码已实机验证）

结构：

```
java-logic-demo/
├── mod.json
└── src/javalogic/
    ├── LogicDemoMod.java      # 主类：造内容 + 自测
    └── WatchBeacon.java       # 方块：定时扫描 + 打敌人 + 特效
```

`src/javalogic/WatchBeacon.java`：

```java
package javalogic;

import arc.util.*;
import mindustry.content.*;
import mindustry.entities.*;
import mindustry.gen.*;
import mindustry.type.*;
import mindustry.world.*;
import mindustry.world.meta.*;

public class WatchBeacon extends Block{
    /** 定时器槽位：写一行 timers++，就多出一个槽位可用 */
    public final int timerScan = timers++;

    public float range = 8f * 12f;
    public float hitDamage = 25f;
    /** 扫描间隔，单位是 tick（60 = 1 秒） */
    public float scanInterval = 60f;

    public static int scans, hits;

    public WatchBeacon(String name){
        super(name);
        update = true;
        solid = true;
        health = 260;
        requirements(Category.defense, ItemStack.with(Items.copper, 40, Items.lead, 25));
    }

    public class WatchBeaconBuild extends Building{
        public Unit target;

        @Override
        public void updateTile(){
            if(!timer(timerScan, scanInterval)) return;

            scans++;
            // 死单位、derelict、不可锁定、雾里的都会在 closestEnemy 内部被排掉
            target = Units.closestEnemy(team, x, y, range, u -> u.health() > 0f);

            Log.info("[java-logic-demo] scan #@ at time=@ target=@", scans, (int)Time.time,
                target == null ? "none" : target.type.name);

            if(target == null) return;

            target.damage(hitDamage);
            Fx.pointHit.at(target.x, target.y);
            hits++;
            Log.info("[java-logic-demo] hit #@ -> hp=@/@", hits, (int)target.health(), (int)target.maxHealth());
        }
    }
}
```

`src/javalogic/LogicDemoMod.java` 的 `init()` 里做了两件与本页结论一一对应的事：

```java
@Override
public void init(){
    // 事件：世界加载完会走到这里
    Events.on(EventType.WorldLoadEvent.class, e ->
        Log.info("[java-logic-demo] WorldLoadEvent: @x@ tiles", Vars.world.width(), Vars.world.height()));

    // 自测 1：HealthComp.damage 是纯扣血
    Unit dummy = UnitTypes.dagger.create(Team.crux);
    dummy.set(0f, 0f);
    float before = dummy.health();
    dummy.damage(25f);
    Log.info("[java-logic-demo] dagger hp @/@ -> @", before, dummy.maxHealth(), dummy.health());

    // 自测 2：定时器槽位的下标边界
    Building plain = noTimerSlot.newBuilding();
    plain.create(noTimerSlot, Team.sharded);

    Log.info("[java-logic-demo] net client=@ server=@ delta=@", net.client(), net.server(), Time.delta);

    for(int i = 0; i <= noTimerSlot.timers; i++){
        try{
            plain.timer(i, 60f);
            Log.info("[java-logic-demo] no-timer-slot: timer(@) ok (timers=@)", i, noTimerSlot.timers);
        }catch(Throwable t){
            Log.info("[java-logic-demo] no-timer-slot: timer(@) threw @: @", i, t.getClass().getSimpleName(), t.getMessage());
        }
    }
}
```

（`newBuilding()` 只从工厂取实例、不加入世界，`create(Block, Team)` 才补齐字段，可以在世界之外安全调用。Source: core/src/mindustry/world/Block.java:1002-1004、core/src/mindustry/entities/comp/BuildingComp.java:142-162；`UnitType.create(Team)` 见 core/src/mindustry/type/UnitType.java:554）

编译打包（classpath 用验证器 fat jar，见[环境搭建](../1-environment/)）：

```bash
javac -cp mindustry-mod-validator-full-1.0.0-all.jar -d classes src/javalogic/*.java
cd classes && jar cf ../java-logic-demo.jar . && cd .. && jar uf java-logic-demo.jar mod.json
run-full.sh java-logic-demo.jar
```

验证器输出（退出码 0）：

```
[I] Loading mod: java-logic-demo
[I] [java-logic-demo] watch-beacon timers=2 scanInterval=60.0
[I] [java-logic-demo] dagger hp 150.0/150.0 -> 125.0
[I] [java-logic-demo] net client=false server=false delta=4.0
[I] [java-logic-demo] no-timer-slot: timer(0) ok (timers=1)
[I] [java-logic-demo] no-timer-slot: timer(1) threw RuntimeException: Out of bounds! Max timer size is 1!
[I] [java-logic-demo] WorldLoadEvent: 100x50 tiles
[I] [java-logic-demo] scan #1 at time=60 target=none
[I] [java-logic-demo] scan #2 at time=120 target=none
...
[I] [java-logic-demo] scan #10 at time=600 target=none

状态: 通过
  错误: 0
  [INFO] [block-test] 方块测试完成: 2 通过, 0 崩溃, 共 2 个 (600 tick)
```

四个可以对照的读数：

- **`timers=2`**：自己那行 `timers++` 拿到的是 1 号槽位，0 号被 `Block` 的 `timerDump` 占了——这不是 bug，是原版约定。
- **扫描间隔稳定**：`time=60 → 120 → 180 …`，差值正好等于 `scanInterval`。定时器量的是 `Time.time`，跟帧数无关，所以软件渲染下（`delta=4`）依然精确。
- **`target=none`**：验证器的方块测试世界里没有敌方单位，所以命中分支没被触发；命中逻辑本身由上一条自测覆盖（`damage(25f)` 让 150 血变成 125）。
- **`timer(1)` 抛异常**：容量 1 时下标只能是 0。写成常量下标最安全，别用 `timer(timers, ...)`。

## 十、坑清单

1. **把 `updateTile()` 当「每 N 帧跑一次」**。它每帧都跑，节奏必须用 `timer()` 控制。
2. **忘记 `timers++` 声明**，然后拿一个越界下标去调 `timer()`：运行时直接抛 `RuntimeException: Out of bounds! Max timer size is N!`。
3. **把 `timer()` 的 `time` 当秒**。单位是 `Time.time` 的 tick 量级，1 秒写 60f。
4. **在客户端改世界**。加方块、拆方块、改配置走 `Call.*`，并用 `net.client()` 判断当前端。
5. **用 `damage()` 当「攻击」**。它只是扣血：不套护甲、不产生伤害来源、不触发任何事件；要范围伤害用 `Damage.damage(...)`。
6. **每帧遍历全部单位**：`Units.closestEnemy` 每次调用都会扫一遍附近实体，放在 `updateTile()` 里等于每帧每个方块扫一次。定时器 + 缓存 `target` 才是原版的做法（见 `RepairTurret.updateTile()`）。

## 下一步

- 内容定义与 Build 类：[内容定义](../2-content/)
- 构建与部署：[环境搭建](../1-environment/)
- 表现层与贴图：[绘制与动画](../5-draw-and-animate/)（待补）
- JSON 侧同类机制：[JSON 内容定义](../../json/2-content/)
