# Local Image Preflight

一个浏览器本地图片预检与导出工具原型，提取自 Draft to Brand 现有的图片尺寸工具能力。

## 能做什么

- 检查原图尺寸、文件大小和宽高比
- 估算指定比例的居中裁切损失
- 保留完整照片，放入 1:1、4:5、3:4、2:3、4:3、3:2 或 16:9 画布
- 添加纯色留白并导出 JPEG/PNG
- 所有图片处理在浏览器内完成，不上传、不登录、不调用 AI
- 支持中文/English 切换

## 本地运行

```bash
python -m http.server 4173
```

然后打开 <http://localhost:4173>。也可以用任何静态文件服务器托管此目录。

运行单元测试：

```bash
npm test
```

## 限制

- 输入最大 10 MiB，支持 JPEG、PNG、WebP。
- 输出长边最大 3000 px，源图最大 3200 万像素。
- 裁切风险只按几何比例计算，不识别标签、主体、文字或平台规则。
- 放大只缩放现有像素，不会补回缺失细节。
- 导出副本可能丢失相机或 AI 来源元数据，请保留原图。

## 来源与状态

核心计算逻辑对应主项目的 `src/lib/photo-export.ts`；交互能力参考 `src/components/PhotoCheck.tsx`、`src/components/PhotoExport.tsx` 和 `src/components/ProductImageResizerPage.astro`。本目录目前是 GitHub-ready 原型，尚未创建远程仓库、发布 GitHub Pages 或选择开源许可证。公开发布前需要由项目所有者确认许可证、品牌名称和最终仓库边界。
