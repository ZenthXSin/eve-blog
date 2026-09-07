# Mindustry 机制与踩坑

> 只收录**实机/源码验证过**的结论。验证基线：原版 Mindustry v159.7（`tag v159.7`），源码证据逐条标注到文件行号。

## 内容

- [物品网络传输与接收端不输出](./item-network-transport) —— acceptItem / pushItemsToNetwork / outputToNearbyBlocks 链路与「收但不吐」根因
- [高版本 fragBullet 丢失原因](./fragbullet-loss) —— fragOnHit / fragOnAbsorb / pierceFragCap / despawn 重构六道门禁
- [属性工厂按天气改变效率](./weather-attribute-efficiency) —— Weather.attrs → state.envAttrs → AttributeCrafter.attribute.env() 链路
- [只攻击友军单位的炮塔](./friendly-targeting-turret) —— 自定义 Turret 覆写索敌 + collidesTeam/heals 坑
- [编译型 Java mod 特效 JSON 可配置](./effect-json-config) —— 反射覆盖 public Effect.renderer，不破坏绘制 lambda
- [流体噪音效果 Shader 复刻（任意形状）](./fluid-shader-replica) —— 绕开 drawTiledFrames 平铺限制的实时 shader 方案
- [Tile Shader 世界坐标方案](./tile-shader-world-coords) —— vert 传世界坐标 + 顶点颜色调制，避免图集走样
- [Arc Seq 为什么不实现 java.util.List](./arc-seq-why-not-list) —— 无序模式 / 底层数组暴露 / Arc 风格 API
- [传送带多方向连接的真相](./conveyor-multilink) —— 邻接驱动的链式传输 + 多状态贴图映射，不是真实分叉

## 写作原则

- 每个结论都标注 `Source: 源码文件:行号`，无法给出源码证据的断言不写。
- JSON/JS 代码输出前先过验证器（`mindustry-mod-validator-full`）。
- 机制类结论以「原版 v159.7 源码」为准，mod 示例仅作佐证。
