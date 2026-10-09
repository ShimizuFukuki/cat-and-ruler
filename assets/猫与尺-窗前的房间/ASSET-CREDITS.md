# 房间材质与模型来源

## 本轮使用的扫描材质

以下原始 1K JPEG 来自 Poly Haven，按 [CC0 1.0](https://polyhaven.com/license) 提供。原始下载保存在 `../../01-sources/房间材质与猫模型-20261009/`，原始图像未改写；网页以 `assets/material-scans.js` 离线嵌入原图字节，在材质着色器中调节木色与墙漆色。

| 材质 | 作者 | 使用位置与处理 |
| --- | --- | --- |
| [Wood Table 001](https://polyhaven.com/a/wood_table_001) | Dimitrios Savva、Rico Cilliers | 家具木材；按部件尺寸和长轴映射纹理，染色，细微法线与粗糙度 |
| [Wood Floor](https://polyhaven.com/a/wood_floor) | Dimitrios Savva | 1.7 m 平铺尺度的长条木地板；基础色、OpenGL 法线、粗糙度 |
| [Painted Plaster Wall](https://polyhaven.com/a/painted_plaster_wall) | Amal Kumar | 墙面与天花；保留细微表面纹理，改用独立暖灰白漆色、完全哑光 |

## 猫

当前使用的是为本项目新做的卡通坐姿猫，模型、材质和动画均由 `../猫与尺-材质与猫模型-20261009/build-cute-cat.py` 构建。可编辑文件为同目录的 `cartoon-cat.blend`，交换文件为 `cartoon-cat.glb`，网页离线资源为 `assets/cartoon-cat.js`。

本轮曾下载检查的 Jonas Dichelle、madtrollstudio 与 J-Toastie 模型均未采用，也未混入当前模型。下载候选和许可证只留在素材目录；不得误称当前猫为这些作者的模型。当前猫没有采用外部骨骼或外部步行动画；其五组动画为呼吸、头部转动、双眼眨动和尾部摆动。

## 运行库

Three.js r160，MIT License。`vendor/room-addons-r160.js` 使用同版本的 BufferGeometryUtils、GLTFLoader 与 RoundedBoxGeometry，仅把 ES 模块导入／导出转换成适合现有离线页面的命名空间。许可证见 `vendor/THREE-LICENSE.txt`。原始源码链接：

- https://github.com/mrdoob/three.js/tree/r160/examples/jsm

猫制作时临时使用 Python 3.11.9 与 Blender Python `bpy==4.5.3`，未将其放进网页依赖。
