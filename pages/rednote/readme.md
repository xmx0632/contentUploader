## 视频上传页面 publish-upload.html：
    
    https://creator.xiaohongshu.com/publish/publish?source=

1. 视频上传文件组件
代码
```html
    <input data-v-ca31ecc0="" data-v-7cbccdb2-s="" class="upload-input" type="file" accept=".mp4,.mov,.flv,.f4v,.mkv,.rm,.rmvb,.m4v,.mpg,.mpeg,.ts">
```


## 视频上传编辑页面 publish.html：

https://creator.xiaohongshu.com/publish/publish

0. 封面设置
   
每次都点击选择其中的第三个div比如下面代码中的：

选中片段代码：
```html
<div data-v-43c590da="" class="default" style="flex: 1 1 0%;">
    <div data-v-43c590da="" class="cover-image column"
        style="background-image: url(&quot;https://ros-preview.xhscdn.com/spectrum/SR8kXQ9-3xDdzPN69EfxEmkM3UNXgqeZiAAKomSWd-C8HIA?sign=4bb5c9625e8622a0e5c8351391de0b44&amp;t=1739970887&quot;);">
    </div><!---->
</div>
```

完整封面设置代码：
```html
<div data-v-43c590da="" class="recommend">
    <div data-v-43c590da="" class="title">智能推荐封面</div>
    <div data-v-43c590da="" class="defaults">
        <div data-v-43c590da="" class="default" style="flex: 1 1 0%;">
            <div data-v-43c590da="" class="cover-image column"
                style="background-image: url(&quot;https://ros-preview.xhscdn.com/spectrum/5h3qE3lQNXyb7jD8stVquMj8vfyNNscOc5I9O2qyw4IYJek?sign=274b65ad4a1d2e938476b6ccd558db2d&amp;t=1739970886&quot;);">
            </div><!---->
        </div>
        <div data-v-43c590da="" class="default" style="flex: 1 1 0%;">
            <div data-v-43c590da="" class="cover-image column"
                style="background-image: url(&quot;https://ros-preview.xhscdn.com/spectrum/1P2hqgvXlJkKgTnO3CrMTgkliFJJxCwW11yq9PXB0xzxGns?sign=930c29e3fdd2b9c9fc0e3e23cd63a48d&amp;t=1739970888&quot;);">
            </div><!---->
        </div>
        <div data-v-43c590da="" class="default" style="flex: 1 1 0%;">
            <div data-v-43c590da="" class="cover-image column"
                style="background-image: url(&quot;https://ros-preview.xhscdn.com/spectrum/SR8kXQ9-3xDdzPN69EfxEmkM3UNXgqeZiAAKomSWd-C8HIA?sign=4bb5c9625e8622a0e5c8351391de0b44&amp;t=1739970887&quot;);">
            </div><!---->
        </div>
    </div>
</div>
```


1. 视频标题输入框
代码：
```html
<input class="d-text" type="text" placeholder="填写标题会有更多赞哦～" value="">
```

1. 视频输入正文描述
代码：
```html
<div class="ql-editor ql-blank" contenteditable="true" aria-owns="quill-mention-list" data-placeholder="输入正文描述，真诚有价值的分享予人温暖"><p><br></p></div>
```

1. 添加合集：
3.1 选择器：

    d-new-form-item collection-container
        d-select-content
            d-text d-text-nowrap  d-select-description --color-text-title


3.2 添加合集

先点击添加合集下拉按钮。
下拉按钮代码
```html
<div class="d-select-suffix --color-text-description d-select-suffix-indicator"><span class="d-icon --color-static --size-icon-default"><!--?xml version="1.0" encoding="UTF-8"?--><svg width="100%" height="100%" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M36 18L24 30L12 18" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path></svg></span></div>
```

然后出现选择合集选项，根据集合名字找到匹配的合集（根据div中的值比对），点击即可。
<div data-v-74dfbc4f="" class="item">日语英语对照学</div>

合集下拉选项代码在这个页面中： publish-clickcollection.html
```html
<div class="d-popover d-popover-default d-dropdown --size-min-width-large"
        style="max-height: 290px; min-width: 320px; max-width: 320px; top: 0px; left: 0px; transform: translate3d(328px, 537px, 0px);">
        <div class="d-dropdown-wrapper" style="max-height: 290px;">
            <div class="d-dropdown-content"><!---->
                <div class="d-options-wrapper">
                    <div class="d-grid d-options" style="display: grid;">
                        <div class="d-grid-item" style="grid-area: 1 / 1 / auto / -1;">
                            <div data-v-74dfbc4f="" class="item">日语英语对照学</div>
                        </div><!---->
                        <div class="d-grid-item" style="grid-area: 2 / 1 / auto / -1;">
                            <div data-v-74dfbc4f="" class="item">学 Mandarin</div>
                        </div><!---->
                        <div class="d-grid-item" style="grid-area: 3 / 1 / auto / -1;">
                            <div data-v-74dfbc4f="" class="item">学 Japanese</div>
                        </div><!---->
                        <div class="d-grid-item" style="grid-area: 4 / 1 / auto / -1;">
                            <div data-v-74dfbc4f="" class="item">小作文</div>
                        </div><!---->
                        <div class="d-grid-item" style="grid-area: 5 / 1 / auto / -1;">
                            <div data-v-74dfbc4f="" class="item">灌篮高手</div>
                        </div><!---->
                        <div class="d-grid-item" style="grid-area: 6 / 1 / auto / -1;">
                            <div data-v-74dfbc4f="" class="item">学单词</div>
                        </div><!---->
                    </div>
                </div>
            </div>
        </div><!---->
    </div>
```


4. 发布按钮
代码：
```html

<div data-v-1fed608d="" class="submit">
    <div data-v-b81396b4="" data-v-1fed608d-s=""
        class="submit"><button data-v-34b0c0bc=""
            data-v-b81396b4="" data-v-1fed608d-s=""
            type="button"
            class="d-button d-button-large --size-icon-large --size-text-h6 d-button-with-content --color-static bold --color-bg-fill --color-text-paragraph custom-button red publishBtn"
            data-impression="{&quot;noteTarget&quot;:{&quot;type&quot;:&quot;NoteTarget&quot;,&quot;value&quot;:{&quot;noteEditSource&quot;:1,&quot;noteType&quot;:3}},&quot;event&quot;:{&quot;type&quot;:&quot;Event&quot;,&quot;value&quot;:{&quot;targetType&quot;:{&quot;type&quot;:&quot;RichTargetType&quot;,&quot;value&quot;:&quot;note_compose_target&quot;},&quot;action&quot;:{&quot;type&quot;:&quot;NormalizedAction&quot;,&quot;value&quot;:&quot;impression&quot;},&quot;pointId&quot;:50979}},&quot;page&quot;:{&quot;type&quot;:&quot;Page&quot;,&quot;value&quot;:{&quot;pageInstance&quot;:{&quot;type&quot;:&quot;PageInstance&quot;,&quot;value&quot;:&quot;creator_service_platform&quot;}}}}"
            data-eaglet-imp="true">
            <div class="d-button-content"><!----><span
                    class="d-text --color-static --color-current --size-text-paragraph d-text-nowrap d-text-ellipsis d-text-nowrap"
                    style="text-underline-offset: auto;"><!---->发布<!----><!----><!----></span><!---->
            </div>
        </button><!----><button data-v-4d788476=""
            data-v-b81396b4="" data-v-1fed608d-s=""
            type="button"
            class="d-button d-button-large --size-icon-large --size-text-h6 d-button-with-content --color-static bold --color-bg-fill --color-text-paragraph custom-button">
            <div class="d-button-content"><!----><span
                    class="d-text --color-static --color-current --size-text-paragraph d-text-nowrap d-text-ellipsis d-text-nowrap"
                    style="text-underline-offset: auto;"><!---->
                    暂存离开 <!----><!----><!----></span><!---->
            </div>
        </button></div>
</div>

```


### 视频上传成功页面 publish-success.html

等待5s，自动跳转到上传页面 https://creator.xiaohongshu.com/publish/publish?source=