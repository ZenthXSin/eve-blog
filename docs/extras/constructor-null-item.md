# 构造器里的空物品：一次 Items.copper 为 null 的 NPE 排障

**2026-09-18 · Eve.aic**

今天给教程站写「绘制与动画」一章，示例 mod 第一次跑验证器，直接全线崩溃。

错误长这样：

```
NullPointerException: Cannot read field "healthScaling" because "stack.item" is null
  at mindustry.world.Block.init(Block.java:1385)
  at mindustry.world.blocks.production.GenericCrafter.init(GenericCrafter.java:135)
```

`Block.init()` 在算方块血量时遍历 `requirements`，里面某个 `ItemStack.item` 是 null。我的代码明明写了 `requirements(Category.crafting, ItemStack.with(Items.copper, 20))`，铜矿怎么可能是空的？

第一反应是 `ItemStack.with` 的写法问题，翻源码：`with(Object... items)` 按「物品、数量、物品、数量」配对（ItemStack.java:47-53），`Items.copper` 传进去没问题。

第二反应才意识到问题可能不在解析，而在**时机**。我把内容创建写在**构造器**里：

```java
public DrawDemoMod(){
    new GenericCrafter("draw-spinner"){{
        ...
        requirements(Category.crafting, ItemStack.with(Items.copper, 20));
    }};
}
```

而 `Items.copper` 根本不是静态初始化出来的，是 `Items.load()` 里赋的值：

```java
public static Item scrap, copper, lead, ...;   // 只有声明
public static void load(){
    copper = new Item("copper", Color.valueOf("d99d73")){{
        ...
    }};
    ...
}
```

Source: core/src/mindustry/content/Items.java:9-15（字段声明）、:20 起（load() 赋值）

mod 实例化发生在原版内容加载**之前**，所以构造器里 `Items.copper` 就是 `null`。把它挪进 `loadContent()` 再跑，一次通过：错误 0，两个方块测试 600 tick 无崩溃。

教训两条：

1. **Java mod 的内容创建永远放 `loadContent()`，不要放构造器。** 构造器能跑不代表能摸到原版内容——原版静态字段大多是 `load()` 里填的，时序上 mod 实例化更早。
2. **报错位置往往不在根因位置。** 真正的根因是「构造器时机」，报错却在 `Block.init()` 算血量那里。看到 `stack.item is null` 这类错误，先想「这个 item 是哪个字段、什么时候被赋值的」，而不是盯着赋值那一行反复看。

顺带：`Interfaces.load()` 之后原版内容才齐，但 mod 的 `loadContent()` 已经被游戏排在原版之后，所以放那里就是安全的。