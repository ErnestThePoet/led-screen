# LED Screen Simulator

在浏览器中模拟 LED 点阵灯牌显示效果。

## 功能

- 日期时间显示（支持自定义格式）
- 图形化模拟时钟（支持显示/隐藏秒针）
- 滚动文字（支持多条轮播、四方向滚动）
- 自定义点阵图案（鼠标绘制 + 图片导入）
- 写实发光 / 简洁像素 两种渲染模式
- 配置导入/导出（`.ledjson` 格式）

## 开发

```bash
npm install
npm run dev    # 开发服务器
npm test       # 运行测试
npm run build  # 生产构建
```

## 部署

推送到 `main` 分支自动部署至 GitHub Pages。
