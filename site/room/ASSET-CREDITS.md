# 房间材质与模型来源

## 当前材质：平涂与简化纹线（2026-10-10）

当前房间使用 `room-materials.js` 中程序绘制的木板、木纹和漆面图案，配合三档明暗的卡通材质。墙壁与天花板使用纯色；家具与狐狸取消照片法线、粗糙度贴图和镜面高光，保留原模型与动画。图案由本项目绘制。下述扫描材质已从当前网页加载列表及成品包撤下，原始素材仍完整保留。

## 历史扫描材质（当前不使用）

以下原始 1K JPEG 来自 Poly Haven，按 [CC0 1.0](https://polyhaven.com/license) 提供。原始下载保存在项目的 `01-sources/房间材质与猫模型-20261009/`，原始图像未改写；上一版本曾以 `assets/material-scans.js` 离线嵌入原图字节。下表记录历史用途。

| 材质 | 作者 | 使用位置与处理 |
| --- | --- | --- |
| [Wood Table 001](https://polyhaven.com/a/wood_table_001) | Dimitrios Savva、Rico Cilliers | 家具木材；按部件尺寸和长轴映射纹理，染色，细微法线与粗糙度 |
| [Wood Floor](https://polyhaven.com/a/wood_floor) | Dimitrios Savva | 1.7 m 平铺尺度的长条木地板；基础色、OpenGL 法线、粗糙度 |
| [Painted Plaster Wall](https://polyhaven.com/a/painted_plaster_wall) | Amal Kumar | 墙面与天花；保留细微表面纹理，改用独立暖灰白漆色、完全哑光 |

## 当前小动物：用户自己的狐狸

来自用户指定的 `D:/kuji kanesa/Blender/Sandbox/マラソン.blend` 中“小狐狸”集合。保留头脸、大耳朵、眼睛、口鼻、尾巴及相应贴图。以原狐狸为造型参考重塑大头、小身体、短腿的简化卡通比例：四肢从身体柔和地延伸，腿根较宽，向下逐渐收细，末端保留圆润、有体积的小脚。身体和四肢由控制网格的四个面连续延伸，保留细分编辑笼；圆润的肚子和白色胸腹作为同一表面的顶点颜色。原场景和外部素材未修改。

可编辑改造文件：`03-deliverables/狐狸与房间预览/小狐狸.blend`；导出资源 `小狐狸.glb`。网站继续使用内部文件名 `assets/cartoon-cat.js`，内容已经替换为用户的狐狸，不再加载上一版坐姿猫。

整条腿摆动、落脚、走动、坐下、睡觉、起身、眨眼和尾巴动作由 `room-activity.js` 驱动。没有使用下载动物或外部动作。上一版模型与来源说明保留在项目历史备份中。

## 运行库

Three.js r160，MIT License。`vendor/room-addons-r160.js` 使用同版本的 BufferGeometryUtils、GLTFLoader 与 RoundedBoxGeometry，仅把 ES 模块导入／导出转换成适合现有离线页面的命名空间。许可证见 `vendor/THREE-LICENSE.txt`。原始源码链接：

- https://github.com/mrdoob/three.js/tree/r160/examples/jsm

猫制作时临时使用 Python 3.11.9 与 Blender Python `bpy==4.5.3`，未将其放进网页依赖。
