## 视频上传页面 publish-upload.html：
    
    https://creator.xiaohongshu.com/publish/publish?source=

1. 视频上传文件组件
代码
```html
    <input data-v-ca31ecc0="" data-v-7cbccdb2-s="" class="upload-input" type="file" accept=".mp4,.mov,.flv,.f4v,.mkv,.rm,.rmvb,.m4v,.mpg,.mpeg,.ts">
```


## 视频上传编辑页面 publish.html：

https://creator.xiaohongshu.com/publish/publish


1. 视频标题输入框
代码：
```html
<input class="d-text" type="text" placeholder="填写标题会有更多赞哦～" value="">
```

2. 视频输入正文描述
代码：
```html
<div class="ql-editor ql-blank" contenteditable="true" aria-owns="quill-mention-list" data-placeholder="输入正文描述，真诚有价值的分享予人温暖"><p><br></p></div>
```

3. 添加合集：
    添加合集
代码：
```html
<div class="d-text d-select-placeholder d-text-ellipsis d-text-nowrap" style="width: 272px;">添加合集</div>
```

4. 发布按钮
代码：
```html
<div class="d-button-content"><!----><span class="d-text --color-static --color-current --size-text-paragraph d-text-nowrap d-text-ellipsis d-text-nowrap" style="text-underline-offset: auto;"><!---->发布<!----><!----><!----></span><!----></div>

```


### 视频上传成功页面 publish-success.html

等待5s，自动跳转到上传页面 https://creator.xiaohongshu.com/publish/publish?source=