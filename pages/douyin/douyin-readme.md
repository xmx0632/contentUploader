# 抖音视频上传

## 1.进入创作中心页面 home.html：
https://creator.douyin.com/creator-micro/home

代码
```html
<div class="bg-tCBPTN"><div class="animate-mhAYmO icon-video-XmCPrm"><div class="icon-video-e1-NvilXp"></div><div class="icon-video-e2-WtrBiQ"></div><img src="data:image/png;base64,iVBORw0KGgoAAAANSBJRU5ErkJggg==" class="icon-video-i1-jYMVDL"></div><div class="content-V1koTs"><div class="title-HvY9Az">发布视频</div><div class="desc-hHzqYm">支持常用格式，推荐mp4、webm</div></div></div>
```

## 2. 点击左上角的“发布视频”按钮，点击下拉菜单“发布视频”，进入作品管理页面 upload.html：
https://creator.douyin.com/creator-micro/content/upload

代码：
```html
<div class="container-drag-info-Tl0RGH"><div class="container-drag-icon"><img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTIiIGhlaWdodZnPgo="></div><div class="container-drag-title-p6mssi">点击上传 或直接将视频文件拖入此区域</div><div class="container-drag-sub-title-N0sUwJ">为了更好的观看体验和平台安全，平台将对上传的视频预审。超过40秒的视频建议上传横版视频</div></div>
```

## 3. 上传视频文件,进入“发布视频”编辑页面 publish.html
https://creator.douyin.com/creator-micro/content/publish?enter_from=publish_page

填写“作品描述”
    1. 填写作品标题，为作品获得更多流量
    2. 添加作品简介

设置封面图片（选择第三张），点击封面图片后，弹出确认框，需要点”确认”按钮设置封面图片

添加到合集，点“请选择合集”下拉框，按名字选择合集，
需要注意：
其中的 select-collection-VQbX7A 是随机生成的，每次不同。
下拉选项中的 <span class="option-title-YS6TS3"> 中的 class 也是随机生成的，需要考虑使用更精确定位的方法来定位。


```html
    // 点击下拉按钮
    <div class="semi-select select-collection-VQbX7A semi-select-open semi-select-single" tabindex="0"><div class="semi-select-selection"><div class="semi-select-content-wrapper"><span class="semi-select-selection-text"><div>请选择合集</div></span></div></div><div class="semi-select-arrow"><svg class="semi-icons semi-icons-chevron_down semi-icons-default" aria-hidden="true"><use xlink:href="#semi-icons-chevron_down"></use></svg></div></div>

    // 选中合集下拉选项
    // <div class="semi-select-option semi-select-option-selected collection-option" role="option"><div class="semi-select-option-icon"><svg class="semi-icons semi-icons-tick semi-icons-default" aria-hidden="true"><use xlink:href="#semi-icons-tick"></use></svg></div><div class="collection-option-tooltip-FWqZ66"><div class="option-left-jqNoPt"><div class="option-img-wrapper-Ckm0l_"><img src="https://p3-sign.douyinpic.com/obj/tos-cn-i-dy/abe7c23206534007899749aa7c8490bc?lk3s=f3356eed&amp;x-expires=1740157200&amp;x-signature=88%2F36mUWJ%2BW9QHZMD6fFs5hn8kc%3D&amp;from=4080365293&amp;s=PackSourceEnum_MIX_WEB&amp;se=false&amp;sc=mix_cover&amp;biz_tag=aweme_mix&amp;l=20250221192411BE2D2BC57575800ECB2B" class="option-img-P0DKMa"></div><span class="option-title-YS6TS3">日语英语对照学</span></div><span class="option-extra-text-d4tBUD">共5个作品</span></div></div>
```




## 4. 点“发布”按钮，发布视频

第一次发视频，需要点发送短信验证码，输入短信验证码
第二次发时，不需要输入短信验证码

## 5.跳转到视频管理页面 manage.html
https://creator.douyin.com/creator-micro/content/manage?enter_from=publish


