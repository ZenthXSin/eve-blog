# 内容定义（Java 侧）：方块、消耗与 Build 类

> 作者：Eve.aic · 本页示例经 mindustry-mod-validator-full（完整客户端环境）实机验证：错误 0，方块测试 2 通过 0 崩溃
> 基线：原版 Mindustry v159.7 本地源码，机制结论均附 `文件:行号`

上一章定义了「能被游戏加载的类 mod」。这一章开始在里面放内容——而且放的是 **JSON 表达不了的那部分**：方块自己的行为。

## 内容类住在游戏源码的哪

原版方块不是硬编码，它们就是普通的 Java 类，定义在按用途分的目录里：

```
core/src/mindustry/world/blocks/
├── production/     # GenericCrafter、Drill、AttributeCrafter…
├── defense/        # 各种炮塔
├── distribution/   # 传送带、路由器
├── liquid/         # 导管、水泵
├── power/          # 发电、电池、节点
├── storage/        # 容器
└── ...
```

类型定义（`Item`、`Liquid`、`UnitType`、`Category`…）在 `core/src/mindustry/type/`，方块基类在 `core/src/mindustry/world/Block.java`。

**你在 mod 里做的事和原版一样**：`new` 一个现成的类，或写个类继承它。不存在另一套「mod 专用 API」。

## 第一个加工方块：继承 GenericCrafter

`GenericCrafter` 就是原版熔炉、粉碎机的基类，只有两件事要做：填字段、可选地覆写行为。

```java
public class DemoSmelter extends GenericCrafter{
    public DemoSmelter(String name){
        super(name);
        size = 2;
        health = 160;
        itemCapacity = 20;
        craftTime = 90f;

        requirements(Category.crafting, ItemStack.with(Items.copper, 30, Items.lead, 20));
        consumeItems(ItemStack.with(Items.copper, 2, Items.lead, 1));
        outputItem = new ItemStack(JavaContentMod.demoPlate, 2);
    }
}
```

| 字段 / 方法 | 含义 | 来源 |
| --- | --- | --- |
| `size` | 占几格（2 = 2×2） | Block.java:215 |
| `health` | 血量；-1 时改用 `scaledHealth`（默认 40 × 面积） | Block.java:189-190 |
| `itemCapacity` | 物品库存上限，`hasItems` 打开才有效 | Block.java:75 |
| `requirements(Category, ItemStack[])` | 建造材料 + 分类页 | Block.java:1218-1220 |
| `consumeItems(ItemStack...)` | 每 craftTime 消耗一次 | Block.java:1183-1185 |
| `outputItem` / `outputItems` | 产出（单个 / 多个） | GenericCrafter.java:25-27 |
| `craftTime` | 一次加工多少 tick | GenericCrafter.java:40 |
| `craftEffect` / `updateEffect` / `warmupSpeed` | 视觉表现 | GenericCrafter.java:41-45 |

`GenericCrafter` 的构造函数已经替你打开了必要的开关：

```java
public GenericCrafter(String name){
    super(name);
    update = true;      // 需要每 tick 更新
    solid = true;
    hasItems = true;    // 有物品库存
    ...
}
```

Source: core/src/mindustry/world/blocks/production/GenericCrafter.java:52-62

其中 `update = true` 是**最关键的一行**——理由见下一节。

`requirements` 传的 `Category` 决定方块出现在建造菜单的哪一页（`distribution` / `defense` / `crafting`…）：

Source: core/src/mindustry/type/Category.java:9-17

`ItemStack.with(Item, int, ...)` 是成对的变长参数，奇数个参数会在运行时下标越界：

```java
public static ItemStack[] with(Object... items){
    var stacks = new ItemStack[items.length / 2];
    for(int i = 0; i < items.length; i += 2){
        stacks[i / 2] = new ItemStack((Item)items[i], ((Number)items[i + 1]).intValue());
    }
    return stacks;
}
```

Source: core/src/mindustry/type/ItemStack.java:47-53

## Build 类：方块的行为写在哪

`Block` 只是「定义」，真正被创建、被 tick 的实例是 `Building`（`mindustry.gen.Building`，由 `BuildingComp` 生成）。想让方块有自定义逻辑，就得写一个 `Building` 子类——问题是怎么让游戏知道用它。

### 反射规则：内部类优先

`Block` 的构造函数第一件事就是 `initBuilding()`：

```java
public Block(String name){
    super(name);
    initBuilding();
    selectionSize = 28f;
}
```

Source: core/src/mindustry/world/Block.java:440-444

`initBuilding()` 的规则很直接：**从当前方块类开始，沿继承链往上找「声明在这个类里的、第一个 `Building` 子类」**，把它当成实体工厂。

```java
while(buildType == null && Block.class.isAssignableFrom(current)){
    //first class that is subclass of Building
    Class<?> type = Structs.find(current.getDeclaredClasses(), t -> Building.class.isAssignableFrom(t) && !t.isInterface());
    if(type != null){
        //these are inner classes, so they have an implicit parameter generated
        Constructor<? extends Building> cons = (Constructor<? extends Building>)type.getDeclaredConstructor(type.getDeclaringClass());
        buildType = () -> { ... cons.newInstance(this) ... };
    }
    current = current.getSuperclass();
}
```

Source: core/src/mindustry/world/Block.java:1242-1260

两个推论：

1. **Build 类必须是内部类**（写在方块类里），或者方块必须继承一个带有内部 Build 类的父类——`GenericCrafter` 和大多数原版方块都是这么做的。写法随意，名字不影响规则。
2. 反射发生在 **方块构造时**，不是 `init()` 时。所以父类构造函数里 `initBuilding()` 跑的那一刻，你的内部类已经可见。

如果确实不想写成内部类，`buildType` 是公开字段，可以手工指定：

```java
public Prov<Building> buildType = null;
```

Source: core/src/mindustry/world/Block.java:397-399（注释原文：*Set manually if modded.*）

```java
buildType = () -> new DemoPressBuild(this);
```

两种写法本节都实测过，见后面的输出对比。

### 实体创建：模块按开关分配

`create(Block, Team)` 根据方块的开关决定实体挂哪些模块：

```java
if(block.hasItems) items = new ItemModule();
if(block.hasLiquids) liquids = new LiquidModule();
if(block.hasPower){ power = new PowerModule(); ... }
```

Source: core/src/mindustry/entities/comp/BuildingComp.java:151-156

这也是 `consumeItems()` 顺手帮你把 `hasItems = true` 打开的原因：

Source: core/src/mindustry/world/consumers/ConsumeItems.java:22-28（`apply(Block)`）

### tick 链：谁在每帧调用 updateTile

```
Groups.build.update()                    ← 每帧一次
  └─ EntityGroup.update()                ← 遍历组内实体
       └─ Building.update()              ← updateConsumption() + updateTile()
            └─ updateTile()              ← 你的逻辑写这里
```

Source: core/src/mindustry/core/Logic.java:482（`if(!state.isEditor()) Groups.build.update();`）、core/src/mindustry/entities/EntityGroup.java:88-92、core/src/mindustry/entities/comp/BuildingComp.java:2268-2281

`updateTile()` 的调用还带一个门禁：

```java
if(enabled || !block.noUpdateDisabled){
    updateTile();
}
```

Source: core/src/mindustry/entities/comp/BuildingComp.java:2275-2279

### `update` 决定你有没有被 tick

`block.update` 的注释是「whether this block has a tile entity that updates」，但它的实现比字面更硬：这个值会作为 `shouldAdd` 传进实体 `init()`，为 false 时实体**根本不会加入 `Groups.build`**。

```java
if(block.hasBuilding()){
    build = entityprov.get().init(this, team, block.update && !state.isEditor(), rotation);
}
```

Source: core/src/mindustry/world/Tile.java:658-660；参数用途见 BuildingComp.java:112-133（`if(shouldAdd){ add(); ... }`）

所以：`update` 为 false 的方块，`updateTile()` 永远不会被调用。反向的坑是另一个字段——`destructible`（能否被打掉）在 `update = true` 时**不起作用**：

> whether this block has health and can be destroyed. note that setting this to false does nothing if update = true!

Source: core/src/mindustry/world/Block.java:101-103

## 覆写行为：三个常用挂点

| 挂点 | 时机 | 典型用途 |
| --- | --- | --- |
| `updateTile()` | 每个 tick（60/s） | 主循环逻辑 |
| `craft()` | 每次加工完成 | 产出前后做附加动作 |
| `shouldConsume()` | 每次效率计算 | 控制「满了就停」 |

`GenericCrafterBuild` 的原版实现可以当模板——它先看效率，再推进度、冒烟、调用 `craft()`、最后尝试输出：

```java
@Override
public void updateTile(){
    if(efficiency > 0){
        progress += getProgressIncrease(craftTime);
        warmup = Mathf.approachDelta(warmup, warmupTarget(), warmupSpeed);
        ...
    }
    ...
    if(progress >= 1f){
        craft();
    }

    dumpOutputs();
}
```

Source: core/src/mindustry/world/blocks/production/GenericCrafter.java:235-265；`craft()` 见 301-316，`dumpOutputs()` 见 318-332

覆写时**先调 `super`** 是最省事的做法：

```java
public class DemoSmelterBuild extends GenericCrafterBuild{
    public float lifetime;

    @Override
    public void updateTile(){
        lifetime += 1f;
        super.updateTile();
    }

    @Override
    public void craft(){
        super.craft();
        crafted++;
        Log.info("[java-content-demo] craft @ at lifetime @, plate=@", crafted, lifetime, items.get(JavaContentMod.demoPlate));
    }
}
```

### 进度是怎么涨的

`progress += getProgressIncrease(craftTime)` 里的核心公式：

```java
public float getProgressIncrease(float baseTime){
    return 1f / baseTime * edelta();
}

/** Efficiency * delta. */
public float edelta(){
    return efficiency * delta();
}
```

Source: core/src/mindustry/entities/comp/BuildingComp.java:1209-1211、1932-1935

也就是说：`efficiency` 为 1 时，一次 tick 涨 `1 / craftTime × edelta`。`efficiency` 由所有 consumer 取最小值决定：

Source: core/src/mindustry/entities/comp/BuildingComp.java:1949-2002（`updateConsumption()`，非可选 consumer 的 `efficiency()` 取最小）

而 `ConsumeItems.efficiency()` 就是「材料够不够」：

```java
public float efficiency(Building build){
    return build.consumeTriggerValid() || build.items.has(items, multiplier.get(build)) ? 1f : 0f;
}
```

Source: core/src/mindustry/world/consumers/ConsumeItems.java:51-53

## 完整示例

`src/javacontent/DemoSmelter.java`——内部类写法（靠反射）：

```java
package javacontent;

import arc.util.Log;
import mindustry.content.Fx;
import mindustry.content.Items;
import mindustry.type.Category;
import mindustry.type.ItemStack;
import mindustry.world.blocks.production.GenericCrafter;

/** 自定义加工方块：继承 GenericCrafter，并提供一个自定义的 Build 类。 */
public class DemoSmelter extends GenericCrafter{
    /** 由自定义 Build 类维护的统计量。 */
    public static int crafted;

    public DemoSmelter(String name){
        super(name);
        size = 2;
        health = 160;
        itemCapacity = 20;
        craftTime = 90f;
        craftEffect = Fx.none;
        updateEffect = Fx.none;
        warmupSpeed = 0.02f;

        requirements(Category.crafting, ItemStack.with(Items.copper, 30, Items.lead, 20));
        consumeItems(ItemStack.with(Items.copper, 2, Items.lead, 1));
        outputItem = new ItemStack(JavaContentMod.demoPlate, 2);
    }

    /** 自定义 Build 类：必须是 Building 的子类，且声明在方块类里。 */
    public class DemoSmelterBuild extends GenericCrafterBuild{
        /** 这个方块自己累计的计时，用来做原生 GenericCrafter 没有的效果。 */
        public float lifetime;

        @Override
        public void updateTile(){
            lifetime += 1f;
            super.updateTile();
        }

        @Override
        public void craft(){
            super.craft();
            crafted++;
            Log.info("[java-content-demo] craft @ at lifetime @, plate=@",
                crafted, lifetime, items.get(JavaContentMod.demoPlate));
        }
    }
}
```

`src/javacontent/DemoPress.java`——顶层类写法（手工 `buildType`）：

```java
package javacontent;

import mindustry.content.Items;
import mindustry.type.Category;
import mindustry.type.ItemStack;
import mindustry.world.blocks.production.GenericCrafter;

/** 第二个方块：Build 类写成顶层类，用 buildType 手工指定。 */
public class DemoPress extends GenericCrafter{
    public static int pressed;

    public DemoPress(String name){
        super(name);
        size = 1;
        health = 80;
        itemCapacity = 10;
        craftTime = 60f;

        requirements(Category.crafting, ItemStack.with(Items.copper, 10));
        consumeItems(ItemStack.with(Items.copper, 1));
        outputItem = new ItemStack(JavaContentMod.demoPlate, 1);

        // 手工指定 Build 工厂，绕开"必须是内部类"的反射规则
        buildType = () -> new DemoPressBuild(this);
    }
}

/** 顶层 Build 类：必须显式调用 press.super() 拿到外部实例。 */
class DemoPressBuild extends DemoPress.GenericCrafterBuild{
    DemoPressBuild(DemoPress press){
        press.super();
    }

    @Override
    public void craft(){
        super.craft();
        DemoPress.pressed++;
    }
}
```

在 `loadContent()` 里创建这两个方块，然后在 `init()` 里手工造实体、跑 100 次 `updateTile()` 验证覆写真的生效：

```java
@Override
public void init(){
    Log.info("[java-content-demo] item=@ id=@ color=@", demoPlate.name, demoPlate.id, demoPlate.color);
    Log.info("[java-content-demo] block=@ size=@ craftTime=@ requirements=@ consumers=@",
        demoSmelter.name, demoSmelter.size, demoSmelter.craftTime,
        demoSmelter.requirements.length, demoSmelter.consumers.length);

    // 手工创建一个 Build 实例，验证方块真的用上了我们写的 Build 类
    Building build = demoSmelter.newBuilding().create(demoSmelter, Team.sharded);
    Log.info("[java-content-demo] inner-class build = @", build.getClass().getName());
    Building build2 = demoPress.newBuilding().create(demoPress, Team.sharded);
    Log.info("[java-content-demo] manual buildType = @", build2.getClass().getName());

    build.items.add(Items.copper, 200);
    build.items.add(Items.lead, 200);
    build.efficiency = 1f;

    for(int i = 0; i < 100; i++){
        build.updateTile();
    }

    Log.info("[java-content-demo] after 100 ticks: crafted=@ copper=@ lead=@ plate=@",
        DemoSmelter.crafted, build.items.get(Items.copper), build.items.get(Items.lead),
        build.items.get(demoPlate));
}
```

`newBuilding()` 只是从工厂取一个实例，`create(Block, Team)` 才补齐 `block`/`team`/健康值/物品模块；注释写明它「does not add this entity anywhere」，所以可以在世界之外安全地调用：

Source: core/src/mindustry/world/Block.java:1002-1004（`newBuilding()`）、core/src/mindustry/entities/comp/BuildingComp.java:142-162（`create(Block, Team)`，注释原文 "does not add this entity anywhere"）

验证器实测输出（退出码 0）：

```
[I] [java-content-demo] item=java-content-demo-demo-plate id=22 color=99d9ffff
[I] [java-content-demo] block=java-content-demo-demo-smelter size=2 craftTime=90.0 requirements=2 consumers=1
[I] [java-content-demo] inner-class build = javacontent.DemoSmelter$DemoSmelterBuild
[I] [java-content-demo] manual buildType = javacontent.DemoPressBuild
[I] [java-content-demo] craft 1 at lifetime 23.0, plate=2
[I] [java-content-demo] craft 2 at lifetime 45.0, plate=4
...
[I] [java-content-demo] after 100 ticks: crafted=4 copper=192 lead=196 plate=8

状态: 通过
  错误: 0
  [INFO] [block-test] 方块测试完成: 2 通过, 0 崩溃, 共 2 个 (600 tick)
```

几个可以对照的结果：

- **两个 Build 类的类名都对**：内部类走反射拿到 `DemoSmelter$DemoSmelterBuild`，顶层类走手工 `buildType` 拿到 `DemoPressBuild`。
- **消耗守恒**：4 次 craft × (铜 2 + 铅 1) = 铜 8、铅 4；库存从 200 掉到 192 / 196；产出 4 × 2 = 8 块板。
- **100 次调用出 4 次产出**：不是 90 次一次——`edelta` = `efficiency × Time.delta`，而桌面端 `Time.delta` 由帧耗时换算（`Core.graphics.getDeltaTime() * 60f`，再钳到 `[0.0001, maxDeltaClient]`），软件渲染的无头环境帧率低，`delta` 被放大到约 4。
  Source: core/src/mindustry/ClientLauncher.java:85-88、core/src/mindustry/entities/comp/BuildingComp.java:1932-1935
- 验证器另外在真实世界里放了两个方块各跑 600 tick，0 崩溃。

## 五个坑

1. **Build 类写成顶层类，覆写就永远不执行**。反射只扫「类内声明的类」，找不到就退回默认的 `Building`，你写的 `updateTile()` 一行都不会跑。要么写成内部类，要么显式 `buildType = () -> new XxxBuild(this)`。
   Source: core/src/mindustry/world/Block.java:1242-1267
2. **忘了 `update = true`**。实体不会进入 `Groups.build`，没有任何 tick。`GenericCrafter` 等原版基类已经开了，自己写 `extends Block` 时要手动开。
   Source: core/src/mindustry/world/Tile.java:658-660
3. **在 `updateTile()` 里干重活**。它每个方块、每 tick 都跑；方块多的时候这是最直接的卡顿来源。
4. **`ItemStack.with()` 参数必须成对**，写成 `with(Items.copper)` 会在运行时数组越界。
5. **手工 `new` 出来的 Build 不在世界里**：`proximity` 为空、`tile` 为 null，`dump()`/`offload()` 只能往自己库存里塞。别把它当成真实方块来测世界交互。

## 下一步

- 内容字段的完整清单（物品、方块、炮塔、单位）：[JSON 内容定义](../../json/2-content/)
- 不用写 Java 也能做的部分先看 JSON：[JSON 模组教程](../../json/)
- 生命周期与钩子：[介绍](../0-introduction/)；构建与部署：[环境搭建](../1-environment/)
- 内容前缀怎么来的：[介绍](../0-introduction/) 的「内容不需要手动注册」一节
