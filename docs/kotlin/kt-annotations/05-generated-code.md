# 生成代码详解


以 `realmod`（`genPackage = io.eve.ktannot.gen`）为例，`@EntityDef([PosComp::class, SyncComp::class]) abstract class TestUnitDef` 生成：

### 5.1 组件接口（`Posc.kt`）

```kotlin
package io.eve.ktannot.gen

@EntityInterface
public interface Posc {
  public var x: Float
  public var y: Float
}
```

接口生成规则：组件方法 → `abstract fun`（跳过 private/static/含泛型参数的方法，父接口重复签名去重）；字段 → `var` 属性（`@ReadOnly` 变 `val`）；与外部接口（`Sized/QuadTreeObject/Scaled/Displayable/Senseable/Settable/Ranged/UnitController/Entityc`）同名的成员自动加 `override`。

### 5.2 实体类（`TestUnit.kt`）

```kotlin
@EntityInterface
public final class TestUnit : Entityc, Posc, Syncc, IndexableEntity__PosGroup {
  public override var id: Int = mindustry.entities.EntityGroup.nextId()
  public override var x: Float = 0f
  public override var y: Float = 0f
  public override var hp: Float = 100f
  private var hp_TARGET_: Float = 0f
  private var hp_LAST_: Float = 0f
  protected var index_PosGroup: Int = 0

  override fun serialize(): Boolean = true
  override fun isAdded(): Boolean = added
  override fun add() { added = true }
  override fun remove() { added = false }
  override fun classId(): Int { TODO("not implemented by EntityGenerator — user supplies implementation in component body or overrides") }

  override fun writeSync(write: Writes) {
    write.f(this.angle)
    write.f(this.hp)
  }
  override fun readSync(read: Reads) {
    this.angle = read.f()
    this.hp = read.f()
  }
}
```

要点：

- 字段按「EntityComp 基字段 → 各组件字段」合并，重名去重；`@SyncField` 字段额外生成 `_TARGET_/_LAST_` 私有字段与 `writeSync/readSync`（按字段名排序）。
- 组件方法体被**文本合并**进实体：自动做 `self()→this`、`Vars→mindustry.Vars`、`Mathf→arc.math.Mathf`、`min→kotlin.math.min`、`hitSize→hitSize()`、常见简单名→FQN 等替换。
- 没有方法体的抽象方法生成 `TODO(...)` 占位，需在组件体实现或实体侧覆写。
- 组归属：实体包含 `gPosGroup` 的 `value` 全部组件 → 实现 `IndexableEntity__PosGroup` 并生成 `index_PosGroup` 字段。

### 5.3 组索引接口（`IndexableEntity__PosGroup.kt`）

```kotlin
public interface IndexableEntity__PosGroup {
  public abstract fun setIndex__PosGroup(index: Int)
}
```

### 5.4 Struct（`PackedPos.kt`）

```kotlin
public object PackedPos {
  public val bitMaskX: Int = (0xFFFFL).toInt()
  public fun x(packed: Int): Short = ((packed ushr 0) and 0xFFFFL).toShort()
  public fun x(packed: Int, `value`: Short): Int = ...
  public fun `get`(x: Short, y: Short, layer: Byte, alive: Boolean): Int { ... }
}
```

### 5.5 Remote（`AnnounceCallPacket.kt` + `Call.kt`）

```kotlin
public class AnnounceCallPacket : Packet() {
  public var message: String = ""
  public var value: Int = 0
  private var DATA: ByteArray = NODATA
  override fun write(WRITE: Writes) { ... }          // both 模式首 player 仅 server 写
  override fun read(READ: Reads, LENGTH: Int) { DATA = READ.b(LENGTH) }
  override fun handled() { BAIS.setBytes(DATA); ... } // both 模式首 player 仅 client 读
  override fun handleClient() { if (!mindustry.Vars.net.active()) return; NetCalls.announce(mindustry.Vars.player, message, value) }
  override fun handleServer(con: NetConnection) { if (con.player == null || con.kicked) return; NetCalls.announce(con.player, message, value) }
}

public object Call {
  public fun registerPackets() {
    mindustry.net.Net.registerPacket { AnnounceCallPacket() }
    mindustry.net.Net.registerPacket { TeleportCallPacket() }
  }
  public fun announce(player: Player, message: String, value: Int) { ... }
  public fun teleport(playerConnection: NetConnection, x: Float, y: Float) { ... }
}
```

### 5.6 Logic（`LogicIO.kt`）

```kotlin
public object LogicIO {
  public val allStatements: Seq<Prov<LStatement>> = Seq.with(Prov { TestLogStatement() })
  public fun write(obj: Any, out: StringBuilder) { ... }
  public fun read(tokens: Array<String>, length: Int): LStatement? { ... }
}
```

### 5.7 资源（`ContentRegions.kt`）

```kotlin
public object ContentRegions {
  public fun loadRegions(content: MappableContent) {
    if (content is KtTestBlock) {
      content.topRegion = arc.Core.atlas.find(content.name + "-top")
      for (INDEX0 in 0 until 4) {
        content.frames[INDEX0] = arc.Core.atlas.find(content.name + "-frames" + INDEX0)
      }
    }
  }
}
```

### 5.8 实体注册（`EntityRegistry.kt`）

所有 `@EntityDef`（类级与字段级）生成实体后，`mindustryMode` 下会额外生成统一注册入口：

```kotlin
public object EntityRegistry {
  // 创建 UnitType 并绑定实体类构造器（entityClass 需是 mindustry.gen.Unit 子类）
  public fun content(name: String, entityClass: Class<out Unit>, creator: Func<String, UnitType>): UnitType

  // 把全部生成实体类映射进 EntityMapping.nameMap
  public fun register()
}
```

用法（mod 内容注册处）：

```kotlin
val type = io.eve.ktannot.gen.EntityRegistry.content("my-test-unit", MyUnitEntity::class.java) { name ->
    UnitType(name)
}
type.constructor = arc.func.Prov { MyUnitEntity() }   // 也可手动绑定
io.eve.ktannot.gen.EntityRegistry.register()           // 批量注册所有生成实体
```

- `EntityMapping.nameMap` 的 key 是实体类名（如 `MyUnitEntity`），供存档/网络按名反序列化实体。
- 字段级 `@EntityDef` 默认继承 `mindustry.gen.UnitEntity`，因此可直接作为 `UnitType` 的实体类型，解决原版 EntityAnno 迁移的核心阻塞点。

