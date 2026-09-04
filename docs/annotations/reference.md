# 注解参考

> 本页是 `kt-annotations` 注解处理器的完整注解清单与用法。全部注解定义在 `annotations/src/main/kotlin/io/eve/ktannot/Annotations.kt`，`@Retention(SOURCE)`，运行时无反射开销。

### 4.1 命名规则（生成器约定）

| 源码声明 | 生成物 |
|---|---|
| `XxxComp`（`@Component`） | 接口 `Xxxc`；`base=true` 时另生成抽象基类 `XxxBase` |
| `XxxDef`（`@EntityDef`） | 实体类 `Xxx`（去 `Def`/`Comp` 后缀；若与首组件基类同名则加 `Entity`） |
| `gXxx`（`@GroupDef`） | 组索引接口 `IndexableEntity__Xxx` |
| `XxxStruct`（`@Struct`） | 值类型 object `Xxx` |
| `fun xxx(...)`（`@Remote`） | 包类 `XxxCallPacket` + `Call.xxx(...)` 调用方法 |

### 4.2 实体体系

#### `@Component(base = false, genInterface = true)` —— 组件声明（类级）

- 组件类通常写成 `abstract class`；字段会生成到实体类，方法体会合并进实体类。
- `base=true`（或加 `@BaseComponent`）表示该组件还生成**抽象基类** `XxxBase`，包含自身与依赖组件的字段，供手写子类复用。
- `@EntityComponent` 是 `@Component` 的等价别名（对标 EntityAnno 的 `ent.anno.Annotations.EntityComponent`），便于从原版注解迁移，两类写法都识别。
- 组件依赖两种表达方式：
  - 继承另一个组件类：`abstract class UnitComp : PosComp()`
  - 实现生成的 `*c` 接口：`abstract class MyUnitComp : Entityc`（组件依赖通过接口递归收集）

#### `@BaseComponent` —— 基组件标记（类级）

等价 `@Component(base = true)`。示例中的 `EntityComp` 用它声明，生成实体获得 Entityc 生命周期：

```kotlin
@Component
@io.eve.ktannot.BaseComponent
abstract class EntityComp {
    @kotlin.jvm.Transient private var added = false
    @kotlin.jvm.Transient var id: Int = mindustry.entities.EntityGroup.nextId()
    fun isAdded(): Boolean = added
    open fun update() {}
    open fun remove() { added = false }
    open fun add() { added = true }
    fun isLocal(): Boolean = (this as? Any) === (mindustry.Vars.player as? Any)
    fun isRemote(): Boolean = false
    @Suppress("UNCHECKED_CAST")
    fun <T : mindustry.gen.Entityc> self(): T = this as T
    @Suppress("UNCHECKED_CAST")
    fun <T> `as`(): T = this as T
    @io.eve.ktannot.InternalImpl abstract fun classId(): Int
    @io.eve.ktannot.InternalImpl abstract fun serialize(): Boolean
    @io.eve.ktannot.MethodPriority(1f)
    open fun read(reads: arc.util.io.Reads) { afterRead() }
    open fun write(writes: arc.util.io.Writes) {}
    open fun beforeWrite() {}
    open fun afterRead() {}
    open fun afterReadAll() {}
}
```

只要组件集合中存在 `EntityComp`，**所有** `@EntityDef` 实体都会实现 `Entityc` 接口并合并这些生命周期方法。

#### `@EntityDef(value, isFinal = true, pooled = false, serialize = true, genio = true, legacy = false, excludeGroups = [], extends = "")` —— 实体定义（类级 / 字段级）

```kotlin
@EntityDef([PosComp::class, SyncComp::class], serialize = true, isFinal = true)
abstract class TestUnitDef

// 字段级：为 UnitType 字段声明实体（对标 EntityAnno 字段级 EntityDef）
class MyContent {
    @EntityDef([UnitComp::class], extends = "mindustry.gen.UnitEntity")
    lateinit var testUnit: UnitType
}
```

- `value`：组件列表（写 `PosComp::class` 或 `Posc::class` 均可），依赖组件递归收集、保序去重。
- `isFinal`：实体类 `final`（默认）或 `open`。
- `serialize`：实体 `serialize()` 返回值（默认 true）。
- `extends`：实体继承的基类全限定名（如 `mindustry.gen.UnitEntity`、`mindustry.entities.units.BuildingTetherPayloadUnit`）。**类级**与**字段级** `@EntityDef` 均生效：指定后生成的实体继承该基类（此时不重复实现 `Entityc`），可用于生成直接对接原版实体体系（`mindustry.gen.Unit` 子类）的单位实体。字段级默认 `mindustry.gen.UnitEntity`。
- `pooled` / `genio` / `legacy` / `excludeGroups`：当前版本已解析但**尚未参与生成逻辑**（见 [已知限制](../reference/limitations.md)）。
- 生成实体内容：组件字段合并（去重；`@Import` 跳过；被 `getX()` 方法或同名方法替代的字段转 `@JvmField` 后备存储）、组件方法合并（签名去重，组件方法优先于 EntityComp 基方法）、`serialize()`、同步方法、`toString()`（默认返回类名）、组接口实现。
- 类级与字段级实体都会生成：
  - `create()` 伴生工厂方法（`@JvmStatic`，直接 `TestUnit.create()` 构造）；
  - 外部 vanilla `*c` 接口面（`Teamc/Drawc/Posc/Entityc/Healthc` 等在 `KNOWN_VANILLA_C` 表内的接口）实现——`mindustryMode` 且未指定 `extends` 时自动补齐接口方法存根；
  - 统一注册入口 `EntityRegistry`（见 [5.8](../reference/generated-code.md#_5-8-实体注册-entityregistry-kt)）。

#### `@GroupDef(value, exclude = [], collide = false, spatial = false, mapping = false, update = false)` —— 实体组（类级）

```kotlin
@GroupDef(value = [PosComp::class], collide = true, spatial = true)
abstract class gPosGroup
```

- 生成 `IndexableEntity__PosGroup` 接口；实体若包含 `value` 全部组件且不包含 `exclude` 组件，则实现该接口，并生成 `protected var index_PosGroup` 与 `override fun setIndex__PosGroup(index: Int)`。
- `collide/spatial/mapping/update` 参数当前**未参与生成**（仅 value/exclude 决定实体归属）。

#### `@EntityInterface` —— 生成代码标记注解

生成器给所有生成的接口与实体类自动加 `@EntityInterface`。消费模块需在 `genPackage` 包下自行声明同名注解（SOURCE retention 即可）。

#### `@SyncField(value, clamped = false)` —— 同步字段（字段级）

- 仅当实体组件列表中存在**类名含 `Sync`** 的组件时生效（如 `SyncComp`）。
- 字段类型必须是 `Float`（否则打印错误并跳过）。
- 生成：`xxx_TARGET_` / `xxx_LAST_` 两个私有字段 + `writeSync/readSync`（字段按名称排序；mindustry 模式用 `arc.util.io.Writes/Reads`，stub 模式用 `ByteBuf`）。
- `value`（线性/角度插值）与 `clamped` 参数当前未区分，注解存在即同步。

#### `@Import` —— 导入字段（字段级）

标记字段由其他组件提供，本组件不重复生成该属性，仅表达依赖。

#### `@ReadOnly` —— 只读字段（字段/方法级）

接口中生成 `val`（不可变属性），基类中跳过该字段。

#### 已声明但生成器尚未接入的注解

`@Replace`、`@Final`、`@SyncLocal`、`@NoSync`、`@NoSerialize`、`@InternalImpl`、`@MethodPriority`、`@CallSuper`、`@OverrideCallSuper`、`@StyleDefaults`、`@TypeIOHandler` —— 已定义在注解库中（对齐原版 API），当前生成器未消费，使用时不会报错但也不产生行为差异。

### 4.3 值类型：`@Struct` + `@StructField(bits)`

对标原版 `@Struct`：把一组字段**位打包**进一个整数基元，生成 `object` 提供 `get/set` 与构造函数。

```kotlin
@Struct
class PackedPosStruct {          // 类名必须以 Struct 结尾
    var x: Short = 0             // 16 bit
    var y: Short = 0             // 16 bit
    @StructField(8)
    var layer: Byte = 0          // 8 bit
    var alive: Boolean = false   // 1 bit
}
```

- 支持字段类型与位宽：`Boolean`(1) / `Byte`(8) / `Short`(16) / `Float`(32) / `Int`(32) / `Long`(64)。
- 总位宽决定存储类型：`≤8 → Byte`、`≤16 → Short`、`≤32 → Int`、`>32 → Long`。
- 生成 `PackedPos` object：

```kotlin
val packed = PackedPos.get(3.toShort(), (-5).toShort(), 110.toByte(), true)  // 构造
PackedPos.x(packed)          // 读 → 3
PackedPos.x(packed, 100)     // 写 → 新值
PackedPos.alive(packed)      // 读 → true
```

- 限制：空字段会报错；非法字段类型抛 `IllegalArgumentException`。

### 4.4 网络：`@Remote(targets, variants, called, forward, unreliable, priority)`

对标原版 `RemoteProcess + CallGenerator`：为一个远程可调用方法生成网络包类、`Call` 静态调用门面与注册逻辑。

```kotlin
object NetCalls {              // ⚠️ 必须放在 object 中（生成器要求静态成员）
    @Remote(targets = Loc.both, variants = Variant.all, called = Loc.both)
    fun announce(player: Player, message: String, value: Int) { ... }

    @Remote(targets = Loc.server, variants = Variant.one)
    fun teleport(player: Player, x: Float, y: Float) { ... }
}
```

参数类型白名单（mindustry 模式）：**原语（Int/Float/Boolean/Long/Double/Short/Byte/Char/String）+ `Player`**。其他类型生成时抛错。

- `targets: Loc` —— 允许触发的端：`server` / `client` / `both`（`none` 非法，生成时报错跳过）。
- `variants: Variant` —— 生成调用变体：`one`（单连接：`Call.xxx(playerConnection, ...)`）、`all`（广播）、`both`（两者）。
- `called: Loc` —— 是否在本地也直接调用（`server`/`client`/`both`/`none`）。
- `forward` —— 额外生成 `Call.xxx__forward(exceptConnection, ...)` 转发方法。
- `unreliable` —— 发送时可靠标志取反（`send(packet, !unreliable)`）。
- `priority` —— 已解析，当前未参与生成。

生成物（`genPackage` 下）：

- `AnnounceCallPacket`：`mindustry.net.Packet`（mindustry 模式）子类，含 `write(WRITE: Writes)` / `read(READ: Reads, LENGTH: Int)` / `handled()` / `handleClient()` / `handleServer(con: NetConnection)`。
- `Call` object：`registerPackets()`（`Net.registerPacket { XxxCallPacket() }`）+ 各调用方法。
- 序列化细节：
  - `Player` 参数 mindustry 模式用 `mindustry.io.TypeIO.writeEntity/readEntity`。
  - `targets = both` 且首个参数是 `player` 时：`write` 只在 `net.server()` 写、`handled` 只在 `net.client()` 读（对齐原版 `writePlayerSkipCheck`）。
  - `handleServer` 开头校验 `con.player == null || con.kicked` 直接 return；`handleClient` 校验 `net.active()`。
- 使用：mod `init()` 里调用 `Call.registerPackets()`（见实战篇）。

枚举：

```kotlin
enum class Loc(val isServer: Boolean, val isClient: Boolean) {
    server(true, false), client(false, true), both(true, true), none(false, false)
}
enum class Variant(val isOne: Boolean, val isAll: Boolean) {
    one(true, false), all(false, true), both(true, true)
}
enum class PacketPriority { low, normal, high }
```

### 4.5 逻辑：`@RegisterStatement(name)` —— 自定义逻辑语句（类级）

对标原版 `LogicStatementProcessor`：注册一个 `LStatement` 子类，生成 `LogicIO` 的读写与语句表。

```kotlin
@RegisterStatement("testlog")
class TestLogStatement : LStatement() {
    var message: String = ""
    override fun build(table: Table) { ... }
    override fun build(builder: LAssembler): LExecutor.LInstruction? = null
}
```

生成 `LogicIO` object：

```kotlin
LogicIO.allStatements          // Seq<Prov<LStatement>>：Seq.with(Prov { TestLogStatement() }, ...)
LogicIO.write(obj, out)        // 按类匹配写 "testlog message"
LogicIO.read(tokens, length)   // tokens[0]=="testlog" 时构造对象，逐字段 valueOf 还原，调用 afterRead()
```

- 序列化字段：非 `static`、非 `@Transient` 的字段按声明顺序读写。
- 读取用类型对应的 `toInt/toFloat/toBoolean/toLong/toShort/toByte/toString`；越界 token 安全跳过。

### 4.6 资源：`@Load(value, length = 1, lengths = [], fallback = "error")` —— 贴图自动加载（字段级）

对标原版 `LoadRegionProcessor`：为方块字段生成 `ContentRegions.loadRegions(content)` 中的图集查找。

```kotlin
class KtTestBlock : mindustry.world.Block("kt-test-block") {
    @Load("@-top")
    var topRegion: TextureRegion = TextureRegion()

    @Load(value = "@-frames", length = 4)
    var frames = arrayOfNulls<TextureRegion>(4)
}
```

- 占位符：`@` → `content.name`；`@size` → `(content as Block).size`；`#` / `#1` → 第一维下标；`#2` → 第二维下标。
- `length` / `lengths`：数组字段。`length = N` 生成单维循环；`lengths = [2, 3]` 生成**完整嵌套循环**（`for INDEX0 … for INDEX1 …`，占位符 `#1/#2` 对应各维下标）。
- `fallback`：非 `"error"` 时作为 `atlas.find(name, fallback)` 的回退参数。
- mindustry 模式生成 `arc.Core.atlas.find(...)`；headless 无 atlas，`@Load` 仅在客户端有意义。
- 调用入口：生成的 `ContentRegions.loadRegions(content: MappableContent)`，由 mod 在方块 `load()` 中调用（示例见实战篇）。

