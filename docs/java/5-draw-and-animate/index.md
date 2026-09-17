# 绘制与动画：Draw 原语、drawer 系统与特效

> 作者：Eve.aic · 本页示例经 mindustry-mod-validator-full（完整客户端环境）实机验证：**错误 0、方块测试 2 通过 0 崩溃（600 tick）**
> 基线：原版 Mindustry v159.7 本地源码；Arc 行号取自 Mindustry 的 `gradle.properties:29` 指定的 commit `208a754044`

上一章解决了「怎么把逻辑跑起来并调通」，这一章解决「方块/单位长什么样、怎么动起来」：绘制入口在哪、有哪些图层、官方 drawer 怎么用、以及怎么自己画。

## 一、绘制入口：`draw()` 每帧都被调用

一个方块的地基渲染从 `Tile` 开始，最终落到建筑实体上：

```java
public void drawBase(Tile tile){
    //delegates to building unless it is null
    if(tile.build != null){
        tile.build.draw();
    }else{
        // 没有实体时直接画静态贴图
    }
}
```

Source: core/src/mindustry/world/Block.java:446-457（`drawBase`）

`Building.draw()` 的**默认实现**只画主贴图（外加队伍角标）：

```java
public void draw(){
    if(block.variants == 0 || block.variantRegions == null){
        Draw.rect(block.region, x, y, drawrot());
    }else{
        Draw.rect(block.variantRegions[Mathf.randomSeed(tile.pos(), 0, Math.max(0, block.variantRegions.length - 1))], x, y, drawrot());
    }

    drawTeamTop();
}
```

Source: core/src/mindustry/entities/comp/BuildingComp.java:1276-1287

两个关键点：

- `draw()` 是**渲染层**的钩子，每帧都会被 `BuildRenderer` 调用；它和逻辑层 `updateTile()` 完全分开，动画状态一般放在字段里、由 `updateTile()` 推进，`draw()` 只负责把它画出来。
- `drawrot()` 决定主贴图旋转多少度，规则是「方块可旋转且声明就地旋转时才转」：

```java
public float drawrot(){
    return block.rotate && block.rotateDraw ? rotation * 90 : 0f;
}
```

Source: core/src/mindustry/entities/comp/BuildingComp.java:593-595

所以如果你想覆写 `draw()`，**别忘了一开始先 `Draw.rect(block.region, x, y, drawrot())` 把主贴图画出来**——覆写之后默认那份就不画了。

生产方块（`GenericCrafter` 族）更省事：它自己不画，把绘制丢给一个名叫 `drawer` 的绘制器对象：

```java
public DrawBlock drawer = new DrawDefault();
```

Source: core/src/mindustry/world/blocks/production/GenericCrafter.java:50；`draw()` 覆写见 GenericCrafter.java:192-193（`drawer.draw(this)`）、发光见 :197-199

## 二、Draw 原语与图层

`Draw` 类是 Arc 的绘制状态机，常用四个：

| 方法 | 作用 |
| --- | --- |
| `Draw.rect(region, x, y, rotation)` | 画一个贴图四角形，可带旋转 |
| `Draw.z(z)` / `Draw.z()` | 设置/读取当前渲染层 |
| `Draw.color(c)` / `Draw.color()` | 设置着色 / 复位为白色 |
| `Draw.alpha(a)` | 设置透明度 |

Source: arc-core/src/arc/graphics/g2d/Draw.java:150-155（`z()`/`z`）、210-226（`color` 一族）、373-385（`rect` 一族）

图层是**排序用的虚拟 z 坐标**：批次渲染前按 z 排序，z 大的画在上面。`Layer` 类存了全套常量，常用（完整见源码）：

```
floor = 0          // 地板
blockUnder = 29.5  // 方块下的连线（传送带接头）
block = 30         // 绝大多数方块
blockOver = 35     // 方块之上
turret = 50        // 炮塔
groundUnit = 60    // 地面单位
bullet = 100       // 子弹
effect = 110       // 特效
flyingUnit = 115   // 飞行单位
```

Source: core/src/mindustry/graphics/Layer.java:6-64

因此默认情况下**子弹（100）本来就画在飞行单位（115）下面**；`BulletType.layer` 的默认值就是 `Layer.bullet`，想压层级直接改这个字段：

```java
/** Z layer to drawn on. */
public float layer = Layer.bullet;
```

Source: core/src/mindustry/entities/bullet/BulletType.java:68-69

单位武器的挂载也有一个相关开关：`Weapon.top` 默认 `true` 表示武器画在机身**上面**，设成 `false` 就画在机身下面（比如挂在腹部的武器）：

```java
public boolean top = true;
```

Source: core/src/mindustry/type/Weapon.java:51

## 三、drawer 系统：官方绘制器怎么选

`DrawBlock` 是所有绘制器的基类，它定义了一组会被方块生命周期调用的钩子：

```java
public void getRegionsToOutline(Block block, Seq<TextureRegion> out){}  // 提交需要描边的贴图
public void draw(Building build){}                                        // 画本体
public void drawLight(Building build){}                                   // 画发光
public void drawPlan(Block block, BuildPlan plan, Eachable<BuildPlan> list){} // 画建造蓝图
public void load(Block block){}                                           // 加载贴图
public TextureRegion[] icons(Block block){ return new TextureRegion[]{}; } // 生成图标
```

Source: core/src/mindustry/world/draw/DrawBlock.java:13-53

常用的三个：

- **`DrawDefault`**：什么都不干，直接画主贴图。`GenericCrafter` 的默认值（DrawDefault.java:13-29）。
- **`DrawMulti`**：把多个 drawer 按顺序组合成一组（DrawMulti.java:15-53）。原版很多复杂方块都是一个 `DrawMulti` 套好几个 drawer。
- **`DrawRegion`**：画一个**附加贴图**，名字是 `方块名 + suffix`，支持偏移、旋转、上色、指定 layer、自旋（DrawRegion.java:17-61）。旋转角度公式见 draw() 实现：

```java
float z = Draw.z();
if(layer > 0) Draw.z(layer);
if(color != null) Draw.color(color);
if(spinSprite){
    Drawf.spinSprite(region, build.x + x, build.y + y, build.totalProgress() * rotateSpeed + rotation + (buildingRotate ? build.rotdeg() : 0));
}else{
    Draw.rect(region, build.x + x, build.y + y, build.totalProgress() * rotateSpeed + rotation + (buildingRotate ? build.rotdeg() : 0));
}
```

Source: core/src/mindustry/world/draw/DrawRegion.java:45-55

注意角度驱动用的是 `totalProgress() * rotateSpeed`（见第四节），所以给 `rotateSpeed` 一个 1~2 的小数字，动画速度就够用了。

JSON mod 里 `drawer` 字段有三种写法，全部在内容解析器里实现（Source: core/src/mindustry/mod/ContentParser.java:198-215）：

```json
{ "drawer": "DrawDefault" }                          // 字符串 = 按类名找
{ "drawer": [ "DrawDefault", "DrawRegion" ] }        // 数组 = 自动包成 DrawMulti
{ "drawer": { "type": "DrawRegion", "suffix": "-rotor", "rotateSpeed": 1 } } // 对象 = 填字段
```

类名与绘制器类型的注册表在 Source: core/src/mindustry/mod/ClassMap.java:470-505（所有 `Draw*` 类都注册了）。

## 四、自定义绘制：覆写 `draw()`

想画官方 drawer 覆盖不了的东西，直接覆写 `Building.draw()`，在默认画法之外叠你自己的图形。示例（结合了三样东西：主贴图、进度形状、发光）：

```java
@Override
public void draw(){
    // 先画主贴图（等价于 DrawDefault 干的事）
    Draw.rect(block.region, x, y, drawrot());

    // 再画一个随总进度旋转、放大的六边形
    Draw.color(Color.orange);
    Fill.poly(x, y, 6, block.size * 6f + totalProgress() * 2f, totalProgress() * 0.2f);
    Draw.color();

    // 持续发光（需要方块 emitLight=true）
    Drawf.light(x, y, 60f, Color.orange, warmup() * 0.6f);
}
```

配套的数值与钩子：

- `Building.warmup()` / `totalProgress()` / `progress()` 都是现成方法（Source: core/src/mindustry/entities/comp/BuildingComp.java:614-623）。`GenericCrafter` 的生产进度在本体字段里累计：`totalProgress += warmup * Time.delta`（Source: core/src/mindustry/world/blocks/production/GenericCrafter.java:257）。
- `Fill.poly(x, y, sides, radius, rotation)` 画正多边形（Source: arc-core/src/arc/graphics/g2d/Fill.java:245-249）。原版 `ShockwaveTower` 就用来画扩散圈（core/src/mindustry/world/blocks/defense/ShockwaveTower.java:135）。
- `Drawf.light(x, y, radius, color, opacity)` 画径向光（Source: core/src/mindustry/graphics/Drawf.java:301）；不需要 `emitLight` 也能调，但有 `emitLight` 时方块会参与光照裁剪（Source: core/src/mindustry/world/Block.java:339-345 字段、1429-1430 裁剪）。
- 想自绘发光而不是画在 `draw()` 里，覆写 `drawLight()`。默认实现只处理「有液体的方块画液体光」（Source: BuildingComp.java:1315-1322；`GenericCrafterBuild` 会先 `super.drawLight()` 再调 `drawer.drawLight`，GenericCrafter.java:197-199）。

## 五、特效：`Effect` 与 `startDelay`

特效（粒子、火花、爆炸）用 `Effect` 对象 + `at(...)` 触发。`Effect.at` 有一堆重载（Source: core/src/mindustry/entities/Effect.java:105-133），最常用 `at(x, y, rotation, color)`。原版几百个现成特效都在 `Fx`（Source: core/src/mindustry/content/Fx.java，如 `colorSpark` 见 :2158-2166）。

想延迟显示（比如先蓄力再冒烟），用 `startDelay`，单位是 tick（1/60 秒）：

```java
public float startDelay;
public Effect startDelay(float d){
    startDelay = d;
    return this;
}
```

Source: core/src/mindustry/entities/Effect.java:35、64-65

它的实现很直白——延迟就是 `Time.run` 包一层再 add：

```java
if(startDelay <= 0f){
    add(x, y, rotation, color, data);
}else{
    Time.run(startDelay, () -> add(x, y, rotation, color, data));
}
```

Source: core/src/mindustry/entities/Effect.java:154-157

另外 `Effect` 还有个 `layer` 字段默认 `Layer.effect`（110），需要时也可以调（Effect.java:43-44）。

## 六、示例 mod 完整代码

本页示例 mod（`tmp/javamod-draw`，jar 名 `java-draw-demo.jar`）定义了两个方块：

- `draw-spinner`：官方 drawer 组合，`DrawDefault` 画主体 + `DrawRegion` 画一个自旋的 `-rotor` 附加件。
- `draw-custom`：覆写 `draw()` 画旋转六边形 + 发光，`updateTile()` 里每 120 tick 触发一次火花特效。

```java
package javadraw;

public class DrawDemoMod extends Mod{

    public DrawDemoMod(){
    }

    @Override
    public void loadContent(){
        // 方块 1：官方 drawer 组合 —— DrawDefault 画主贴图，DrawRegion 画一个旋转件
        GenericCrafter spinner = new GenericCrafter("draw-spinner"){{
            requirements(Category.crafting, ItemStack.with(Items.copper, 20));
            size = 2;
            craftTime = 60f;
            consumeItems(ItemStack.with(Items.copper, 1));
            outputItems = ItemStack.with(Items.lead, 1);
            drawer = new DrawMulti(
                new DrawDefault(),
                new DrawRegion("-rotor"){{
                    rotateSpeed = 1f;
                    spinSprite = true;
                    layer = Layer.blockOver;
                }}
            );
        }};

        // 方块 2：覆写 draw() 自定义绘制 + emitLight 发光 + 特效
        GenericCrafter custom = new GenericCrafter("draw-custom"){{
            requirements(Category.crafting, ItemStack.with(Items.copper, 20));
            size = 3;
            craftTime = 120f;
            consumeItems(ItemStack.with(Items.lead, 1));
            outputItems = ItemStack.with(Items.copper, 1);
            emitLight = true;
            lightRadius = 50f;
            lightColor = Color.orange;
        }};
        custom.buildType = CustomDrawBuild::new;
    }

    public static class CustomDrawBuild extends Building{
        @Override
        public void draw(){
            Draw.rect(block.region, x, y, drawrot());
            Draw.color(Color.orange);
            Fill.poly(x, y, 6, block.size * 6f + totalProgress() * 2f, totalProgress() * 0.2f);
            Draw.color();
            Drawf.light(x, y, 60f, Color.orange, warmup() * 0.6f);
        }

        @Override
        public void updateTile(){
            if(timer(0, 120f)){
                Fx.colorSpark.at(x, y, 0f, Color.orange);
            }
        }
    }
}
```

验证结果（完整客户端环境，600 tick）：

```
状态: 通过
错误: 0
[INFO] [block-test] 方块测试完成: 2 通过, 0 崩溃, 共 2 个 (600 tick)
```

（另有 37 条 WARN，全部是 `content-anomaly` 这类「可选字段为 null」的正常提示，见第 4 章「验证器报告解读」。示例未带贴图，`draw-spinner-rotor` 与主贴图会报 `missing-sprite` 警告；正式 mod 记得补图。）

## 七、常见坑

1. **Mod 构造器里不能碰 `Items`/`Blocks` 的静态字段。** 原版内容是 `Items.load()` 这类方法里赋值的（Source: core/src/mindustry/content/Items.java:9-15 只声明字段、:20 起 `load()` 里赋值），mod 实例化比原版内容加载更早，构造器里 `Items.copper` 是 `null`，`Block.init()` 算血量时直接 NPE（Source: core/src/mindustry/world/Block.java:1385）。**内容创建一律放 `loadContent()`。**（本次示例就在这上面栽过，详见番外《构造器里的空物品》。）
2. **覆写 `draw()` 后默认主贴图不画了**，记得第一行自己 `Draw.rect(block.region, x, y, drawrot())`。
3. **`Draw.color()` 改过颜色要复位**：无参 `Draw.color()` 重置为白色，否则下一个用同一批次绘制的东西全被你染色。
4. **贴图名约定**：`DrawRegion` 找的是 `方块名 + suffix`（如 `draw-spinner` + `-rotor` = `draw-spinner-rotor`）；`DrawDefault` 用方块主贴图 `方块名.png`。
5. **特效放 `updateTile` 里触发**，不要直接放 `draw()`——`draw()` 只在相机看得到时被调用，逻辑不该依赖它（实测验证器 600 tick 特效正常触发，逻辑在 `updateTile`）。