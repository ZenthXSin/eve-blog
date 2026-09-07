# Arc Seq 为什么不实现 java.util.List

> Source: conversation + `源码和示例/Arc/arc-core/src/arc/struct/Seq.java`

`arc.struct.Seq` 没有实现 `java.util.List`，核心不是「作者忘了」，而是它故意做成了一套**面向 Arc/Mindustry 运行时需求的轻量数组容器**，目标和标准集合接口并不完全一致。

## 结论

`Seq` 更像一个「高性能、可暴露底层数组、允许无序删除、带 Arc 风格函数工具」的专用容器，而不是一个严格遵守 Java Collection Framework 语义的 `List` 实现。

## 主要原因

### 1. `Seq` 的语义和 `List` 不完全兼容

`Seq` 支持 `ordered` / `unordered` 两种模式：

- `ordered = true` 时，删除元素会搬移后续元素，保持顺序。
- `ordered = false` 时，删除元素会把最后一个元素搬到被删除位置，避免整段数组拷贝。

源码里非常明显：

- `remove(int index)` 中，若 `ordered` 为假，执行 `items[index] = items[size];`
- `insert(int index, T value)` 中，若 `ordered` 为假，也会直接覆盖式挪位，而不是标准的顺序插入语义。

而 `List` 默认表达的是一个**有稳定顺序的位置序列**。虽然 `List` 接口本身不强制复杂度，但大多数调用者会天然假设：插入后后续元素顺移、删除后元素相对顺序保持、`equals`/`hashCode` 遵循列表顺序语义。`Seq` 的无序模式会破坏这种预期。

### 2. `Seq` 公开了底层存储，目标就是「少抽象层」

`Seq` 直接暴露 `public T[] items;`、`public int size;`、`public boolean ordered;`。这不是为了提供标准封装，而是为了让 Arc 内部代码直接操作底层数组，减少中间层和额外检查。

### 3. 它追求 Arc 自己的 API 风格

`Seq` 里有大量 Arc 风格方法：`each`、`map`、`flatMap`、`select`、`retainAll(Boolf<T>)`、`sort(Floatf<? super T>)`、`random()`、`first()/peek()/pop()`、`asMap()/asSet()`。这些围绕 Arc 的 `Boolf`、`Cons`、`Func`、`Floatf` 函数接口设计。

如果实现 `List`，就要额外承担 `ListIterator`、`subList`、`containsAll`、`addAll/removeAll/retainAll(Collection<?>)`、`toArray(T[])` 等标准集合兼容责任，类会膨胀，也迫使它往 Java 标准集合语义靠拢。

### 4. `Seq` 自己的 equals/hashCode 就不是标准 List 路线

- `hashCode()` 在 `ordered == false` 时直接退回 `super.hashCode()`。
- `equals(Object)` 只接受另一个 `Seq`，而且双方都必须是 `ordered`。

## 对 mod 开发的启发

- 遍历/删除大量实体时，优先用 `Seq` + `ordered=false` 的无序删除（O(1) 挪尾），别当成普通 List。
- 不要把 `Seq` 直接塞给期望 `java.util.List` 的第三方 API；需要适配时 `seq.toArray` 或自己拷贝。
- `each`/`select`/`flatMap` 是高频范式，比手动 for + ArrayList 更贴近 Arc 惯例。