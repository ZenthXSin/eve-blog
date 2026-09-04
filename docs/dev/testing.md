# 十、验证与测试


| 层级 | 位置 | 内容 | 状态 |
|---|---|---|---|
| stub 单测 | `tests/` | 位打包往返 / Packet write-read / LogicIO 注册 | ✅ 3/3 |
| headless 实机 | `realmod/` | KTA-STRUCT/SYNC/GROUP/LOGIC/REMOTE/FULLUNIT/BUILD/VUNIT/VSIMPLE 共 9 项自检 | ✅ |
| full 客户端 | `mindustry-mod-validator-full` | 贴图加载、shader 编译、无运行时错误 | ✅ |
| 单元测试记录 | `GenRuntimeTest.kt` | `coordBitPacking` / `packetWriteRead` / `logicStatementRegistered` | ✅ |

