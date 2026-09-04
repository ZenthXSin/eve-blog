# 十一、已知限制


1. **实体管线独立，不自动合并进 `mindustry.gen.Unit`**。原版 EntityAnno 的 `@EntityDef({Unitc.class, ...})` 会把 mod 组件注入官方实体体系；kt-annotations 默认生成 mod 本地独立实体类。**缓解**：`v159.7.2` 起字段级 `@EntityDef` 支持 `extends = "mindustry.gen.UnitEntity"`（默认值），生成直接继承原版实体的类，可通过 `EntityRegistry.content(...)` 作为 `UnitType` 实体类型（见 [5.8](../reference/generated-code.md#_5-8-实体注册-entityregistry-kt)）。
2. **无 `@Remove` 等价注解**：无法从合并实体中移除某组件的方法。
3. **已声明未接入的注解**：`@Replace`、`@Final`、`@SyncLocal`、`@NoSync`、`@NoSerialize`、`@InternalImpl`、`@MethodPriority`、`@CallSuper`、`@OverrideCallSuper`、`@StyleDefaults`、`@TypeIOHandler`。
4. **参数未完整实现**：`@EntityDef(pooled/genio/legacy/excludeGroups)`、`@GroupDef(collide/spatial/mapping/update)`、`@SyncField(value/clamped)`、`@Remote(priority)` 已解析但未参与生成。
5. **类型解析依赖白名单**：Scanner 用 `knownFqn` 表把简单类型名解析为 FQN，白名单外的类型请写全限定名，或扩展 `Scanner.knownFqn`。
6. **含泛型参数的方法被跳过**（如 `getCollisions(consumer: Cons<QuadTree<...>>)`）。
7. **方法体合成为文本替换**：`self()/Vars/Mathf/min/hitSize` 等替换有正则边界保护，但复杂表达式仍建议构建后检查生成结果。
8. **`AssetsGenerator`（Tex/Sounds/Musics 存根）已接入 `GenerateTask`**，但仅为占位存根，运行时由 Mindustry 自己的 asset 加载器填充（对齐原版 `AssetsProcess` 的能力有限）。
9. **`@Load` 在 headless 无 atlas 环境不可用**（仅客户端有意义）。
10. **`@Remote` 白名单外的参数类型**：mindustry 模式下仅支持原语 + `Player`，其他类型生成时抛错跳过。

