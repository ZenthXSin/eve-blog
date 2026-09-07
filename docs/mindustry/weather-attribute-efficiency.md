# 属性工厂按天气改变效率

> 来源：群聊 2026-08-15 + v159.7 源码验证

## 结论

可以，机制是现成的。

1. 天气定义里有 `attrs`（`Weather.java:57`），如孢子迷雾 `attrs.set(spores, 1f)`（`Weathers.java:74`）、雨 `water 0.2`、沙尘 `water -0.1`。
2. 每 tick `Logic.java:596-598` 把所有活跃天气的 attrs 按强度（opacity）叠加进 `state.envAttrs`。
3. 属性工厂效率公式（`AttributeCrafter.java:87`）：`baseEfficiency + min(maxBoost, boostScale × attrsum) + attribute.env()`，最后一项直接读环境属性。

所以孢子迷雾下用 spores 的培养舱效率会 +1（不受 maxBoost 上限限制）。

## Source

- `core/src/mindustry/world/blocks/production/AttributeCrafter.java:87`
- `core/src/mindustry/core/Logic.java:596-598`
- `core/src/mindustry/type/Weather.java:57`、`core/src/mindustry/content/Weathers.java:74`
