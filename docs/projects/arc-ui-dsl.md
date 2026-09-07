# arc-ui-dsl：Arc UI 的组合式 Kotlin DSL

> 仓库：<https://github.com/ZenthXSin/arc-ui-dsl> · release: v1.0.0 · 验证基线：Arc v159.7 / Mindustry v159.7

`arc.ui.dsl` 提供对 **Arc 引擎（v159.7）** UI 控件的组合式 Kotlin DSL，用于在 Mod 中声明式构建界面，替代原版 `table { t -> ... }` 的 lambda-参数式写法。所有元素构建函数都是 `TableScope` 的扩展。

## 一、设计理念

### 组合式 receiver DSL

传统 Mindustry/arc 写法是「传参式」嵌套：

```kotlin
root.table { t2 ->
    t2.add(label("标题"))
    t2.row()
}
```

本 DSL 改为 **receiver 式**：块内 `this` 同时是「元素作用域」与「cell 作用域」：

```kotlin
root.scoped {
    label("标题") { pad(5f) }      // 元素+cell 都在块内配
    row()
    table {
        repeat(3) { label("项"); row() }
    }.growX()                      // 对子容器的 cell 配置
}
```

- **元素作用域**：写元素属性（`touchable = ...`）、绑事件（`clicked {}`、`update {}`）、加子元素。
- **cell 作用域**：直接调 `pad/fillX/grow/width/top/align/colspan` 等，作用于「本 scope 元素在父容器中的 cell」。

### 统一 cell 配置

由接口 `CellConfig` 统一提供 `pad/fillX/grow/size/...`，`TableScope`、`ElementCellScope`、`PaneScope`、`DialogScope`、`TreeScope` 都实现它，任何 scope 内写法一致。

> **顶层 root 的 cell 为 null**：`Table.scoped {}` 顶层块内调 cell 方法**不生效也不崩溃**；要在 root 上配置尺寸直接用 `self` 或底层 `Table` API。

## 二、快速上手

```kotlin
fun build(root: Table) {
    root.scoped {
        background = Tex.pane
        align(Align.top)

        table {
            label("设置") { setFontScale(1.5f) }   // receiver 是 Label
            row()
            textButton("开始") {
                clicked { Log.info("clicked") }
                size(120f, 40f)
            }
            row()
            progressBar(0f, 100f, 1f) { growX() }
            row()
            checkBox("启用") { padTop(4f) }
        }.pad(10f)
    }
}
```

## 三、控件覆盖

| 分类 | 控件 |
|---|---|
| 容器/核心 | `table` / `add` / `label` / `image` / `pane` / `stack` / `spacer` / `collapser` / `repeat` |
| 按钮 | `button` / `textButton` / `imageButton` / `checkBox` |
| 输入 | `slider` / `progressBar` / `textField` / `textArea` / `touchpad` / `tooltip` |
| 窗口 | `dialog` / `baseDialog`（Mindustry 默认对话框，mod 首选） |
| Mindustry 特有 | `borderImage` / `reqImage` / `gridImage` / `bar` |
| 杂项 | `colorImage` / ButtonGroup 互斥 / `tree` |

覆盖 arc v159.7 全部 18 个基础控件 + 5 个 Mindustry 特有控件。`SelectBox`/`TextTooltip`/`TextIconButton` 在 arc v159.7 **不存在**（libGDX 特性未移植），无需补。

## 四、scene 安全（重要）

Arc 中很多控件提供了「无 style 便捷构造」，内部调 `Element.getScene().getStyle(Style)`；而 `getScene()`（`stage`）在元素尚未加入已挂载的 Scene 时返回 null，会 NPE。

| 情况 | 策略 |
|---|---|
| 按钮 / CheckBox / TextField / TextArea / Touchpad / Slider（无 style） | 用 `table.add(新控件())` 惰性构造，加入时元素已处于场景树，**scene 安全** |
| `progressBar` / `pane` / `dialog` / `tree` / `baseDialog` | 库内显式 `Core.scene.getStyle(...)`，**需在构建界面时（Core.scene 已运行）调用**；否则请传显式 style |
| `colorImage` / `borderImage` / `reqImage` / `gridImage` / `bar` | 构造完全不取 style，始终安全 |

> 证据：`source/Arc/arc-core/src/arc/scene/ui/Button.java`（`Button()` → `scene.getStyle(ButtonStyle)`）、`Element.java`（`getScene()` 返回 `stage`）。

## 五、与底层 API 的关系

每个 scope 都持有底层控件（`TableScope.table`、`PaneScope.pane`、`DialogScope.dialog`、`TreeScope.tree`、`ElementCellScope.elem`），可在 DSL 之外继续操作底层 API。DSL 只是**声明式壳**，不改变控件行为；返回控件的函数可拿返回值做后续处理。

## 历史

- 从 IE 项目 `ie.core.ui` 起步（参考 Jetpack Compose 设计），重写 MultiCrafter 的三个菜单函数验证后独立成库
- 发布 GitHub `ZenthXSin/arc-ui-dsl`，包名 `arc.ui.dsl`，release v1.0.0
- 全部类 `@author Eve`
