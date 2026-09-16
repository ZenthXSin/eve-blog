# Java 模组教程

> 本轨教程按章节持续补写，未完成章节标注「待补」。基线：原版 Mindustry v159.7，结论均需源码行号或验证器实证。

## 章节

- [介绍](./0-introduction/) —— 类 mod 最小结构、Mod 五个钩子、内容构造即注册（含实机验证示例）
- [环境搭建](./1-environment/) —— JDK 17、JitPack 依赖、Gradle 与 javac 两条构建路线（均实测通过）
- [内容定义](./2-content/) —— GenericCrafter 字段表、Build 类反射规则与 tick 链、消耗与效率、覆写 updateTile/craft（含实机验证示例）
- [基础逻辑](./3-basic-logic/) —— updateTile 的调用链、delta/edelta、timers++ 定时器槽位、Units/Damage 查询与伤害、Fx 特效、Events 事件、联机 Call 与 net.client()（含实机验证示例）
- [调试](./4-debug/) —— Log 打点与 @ 占位符、级别过滤、验证器报告解读、主类加载失败与 ClassNotFoundException、依赖误打包检测（含实机验证示例）
- [绘制与动画](./5-draw-and-animate/) —— 待补
- [UI](./6-ui/) —— 待补
- [程序结构](./7-program-structure/) —— 待补
- [OpenGL 与 Shader](./8-opengl/) —— 待补
- [附录](./9-appendix/) —— 待补
