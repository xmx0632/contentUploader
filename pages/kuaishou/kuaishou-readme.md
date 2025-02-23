# 快手视频上传

## 1.进入创作中心上传视频页面 video.html：
https://cp.kuaishou.com/article/publish/video?tabType=1

代码
```html
<div class="ant-tabs-content-holder">
    <div
        class="ant-tabs-content ant-tabs-content-top ant-tabs-content-animated">
        <div role="tabpanel" tabindex="0" aria-hidden="false"
            class="ant-tabs-tabpane ant-tabs-tabpane-active"
            id="rc-tabs-0-panel-1"
            aria-labelledby="rc-tabs-0-tab-1">
            <div id="joyride-wrapper"
                class="_publish-container_1vksx_7"><input
                    type="file"
                    accept="video/*,.mp4,.mov,.flv,.f4v,.webm,.mkv,.rm,.rmvb,.m4v,.3gp,.3g2,.wmv,.avi,.asf,.mpg,.mpeg,.ts"
                    style="display: none; opacity: 0; width: 0px; height: 0px;">
                <main
                    class="_publish-container-upload_1vksx_12">
                    <section class="_upload-container_hlszi_12">
                        <div
                            class="_dragger-container_hlszi_39">
                            <div
                                class="_dragger-content_hlszi_39">
                                <div
                                    class="_upload-icon_hlszi_57">
                                </div>
                                <div
                                    class="_upload-text_hlszi_68">
                                    <p
                                        class="_upload-tip_hlszi_68">
                                        拖拽视频到此或点击上传</p><button
                                        class="_upload-btn_hlszi_77">上传视频</button>
                                </div>
                            </div>
                            <div
                                class="_rule-container_hlszi_119">
                                <div
                                    class="_rule-item_hlszi_129">
                                    <p
                                        class="_rule-title_hlszi_136">
                                        视频大小</p>
                                    <p
                                        class="_rule-description_hlszi_145">
                                        支持时长30分钟以内，最大8GB的视频文件
                                    </p>
                                </div>
                                <div
                                    class="_rule-break_hlszi_164">
                                </div>
                                <div
                                    class="_rule-item_hlszi_129">
                                    <p
                                        class="_rule-title_hlszi_136">
                                        视频格式</p>
                                    <p
                                        class="_rule-description_hlszi_145">
                                        支持常见视频格式，推荐使用mp4上传<span
                                            class="_video-format-tip_hlszi_156"></span>
                                    </p>
                                </div>
                                <div
                                    class="_rule-break_hlszi_164">
                                </div>
                                <div
                                    class="_rule-item_hlszi_129">
                                    <p
                                        class="_rule-title_hlszi_136">
                                        视频分辨率</p>
                                    <p
                                        class="_rule-description_hlszi_145">
                                        最高支持8K，推荐上传1080p(1920*1080)<br>及以上分辨率的视频
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>
                    <div class="_onvideo-bar_e9ki6_12">
                        <div class="_tips_e9ki6_24"><img
                                draggable="false"
                                src="data:image/svg+xml,%3c?xml%20version='1.0'%20encoding='UTF-8'?%3e%3csvg%20width='40px'%20height='40px'%20viewBox='0%200%2040%2040'%20version='1.1'%20xmlns='http://www.w3.org/2000/svg'%20xmlns:xlink='http://www.w3.org/1999/xlink'%3e%3ctitle%3e-mockplus-%3c/title%3e%3cg%20id='页面-1'%20stroke='none'%20stroke-width='1'%20fill='none'%20fill-rule='evenodd'%3e%3cg%20id='上传视频-新增360全景'%20transform='translate(-256.000000,%20-670.000000)'%3e%3cg%20id='tips'%20transform='translate(232.000000,%20650.000000)'%3e%3cg%20id='icon/云剪辑'%20transform='translate(24.000000,%2020.000000)'%3e%3ccircle%20id='椭圆形'%20fill='%23fe3666'%20fill-rule='nonzero'%20opacity='0.05'%20cx='20'%20cy='20'%20r='20'%3e%3c/circle%3e%3cpolyline%20id='路径-5'%20stroke='%23fe3666'%20stroke-width='2'%20stroke-linecap='round'%20stroke-linejoin='round'%20points='30.4666667%2026.3891602%2015.9621582%2014.0857143%2011.5%2014.0857143%2011.5373535%2026.3891602%2015.6083984%2026.3891602%2030.4666667%2014.0857143'%3e%3c/polyline%3e%3c/g%3e%3c/g%3e%3c/g%3e%3c/g%3e%3c/svg%3e"
                                class="_icon-onvideo_e9ki6_27"
                                alt="onvideo">
                            <div class="_tips-wrapper_e9ki6_32">
                                <p class="_tips-title_e9ki6_32">
                                    快手云剪</p>
                                <p class="_tips-sub_e9ki6_39">
                                    5分钟搞定视频剪辑，多种AI工具提高制作效率</p>
                            </div>
                        </div><button
                            class="_onvideo-button_e9ki6_46">立即体验</button>
                    </div>
                </main>
            </div>
        </div>
        <div role="tabpanel" tabindex="-1" aria-hidden="true"
            class="ant-tabs-tabpane"
            style="visibility: hidden; height: 0px; overflow-y: hidden;"
            id="rc-tabs-0-panel-2"
            aria-labelledby="rc-tabs-0-tab-2"></div>
        <div role="tabpanel" tabindex="-1" aria-hidden="true"
            class="ant-tabs-tabpane"
            style="visibility: hidden; height: 0px; overflow-y: hidden;"
            id="rc-tabs-0-panel-3"
            aria-labelledby="rc-tabs-0-tab-3"></div>
    </div>
</div>
```

## 2. 上传视频文件，进入“发布视频”编辑页面 publish.html

### 2.1 
https://cp.kuaishou.com/article/publish/video

填写内容后的页面：after-fill-content.html

填写“作品描述”
    1. 添加作品描述，需要自动根据文件名调用 ai 生成描述信息，注意：其中的 class="_description_oei9t_59" 有可能会变化
代码：

```html
<div class="_description_oei9t_59" id="work-description-edit" placeholder="添加合适的话题和描述，作品能获得更多推荐～" contenteditable="true" style="height: 92px;"></div>
```

### 2.2
设置封面图片（选择第三张）
智能推荐封面 代码如下：
```html
<div class="_recommend-cover_y5cqm_130 _big_y5cqm_77"><div class="_recommend-cover-header_y5cqm_143">智能推荐封面</div><div class="_recommend-cover-main_y5cqm_149"><div class="_recommend-cover-item_y5cqm_157"><span style="width: 100%; height: 100%; display: inline-flex;"><span class="_masks-wrapper_y5cqm_167"><img src="https://v2-cp.ssscdn.com/ksc2/4ojyNYClIIkY4wY1IMbw4VlB9hq-hScGcvrmQhnTUTPqAAC1Ihyj1zexkmugZS9NtJM69tUt2YbPGipMXhPSJ5zYx1K9yFC1y7i684Tl_Hf0hv9EZh4QczpCPwF673TWT3yUm6tXbZwirXzxt0hwkQ?pkey=AAUhgYYDg3CbhHQ7Hf01k54vKRh6nHzcuEs1TXij6unAL4uOT92Y0c42WzFj06ZahkAwuAk8vnGrle-gO8YqWsY7rM_z_iqgGUwarKtNVNGa9ti1jJ0ZlHWFVJ6YGhZygU4" alt=""><span class="_masks_y5cqm_167"></span></span><div style="position: absolute; top: 0px; left: 0px; width: 100%;"><div><div class="ant-tooltip ant-tooltip-placement-top  ant-tooltip-hidden" style="left: -482px; top: -793px; transform-origin: 50% 298.281px; pointer-events: none;"><div class="ant-tooltip-content"><div class="ant-tooltip-arrow"><span class="ant-tooltip-arrow-content" style="--antd-arrow-background-color: #fff;"></span></div><div class="ant-tooltip-inner" role="tooltip" style="font-size: 12px; border-radius: 2px; padding: 4px; background: rgb(255, 255, 255);"><img class="_recommend-preview_y5cqm_241" src="https://v2-cp.ssscdn.com/ksc2/4ojyNYClIIkY4wY1IMbw4VlB9hq-hScGcvrmQhnTUTPqAAC1Ihyj1zexkmugZS9NtJM69tUt2YbPGipMXhPSJ5zYx1K9yFC1y7i684Tl_Hf0hv9EZh4QczpCPwF673TWT3yUm6tXbZwirXzxt0hwkQ?pkey=AAUhgYYDg3CbhHQ7Hf01k54vKRh6nHzcuEs1TXij6unAL4uOT92Y0c42WzFj06ZahkAwuAk8vnGrle-gO8YqWsY7rM_z_iqgGUwarKtNVNGa9ti1jJ0ZlHWFVJ6YGhZygU4" alt="" style="border-radius: 2px;"></div></div></div></div></div></span></div><div class="_recommend-cover-item_y5cqm_157"><span style="width: 100%; height: 100%; display: inline-flex;"><span class="_masks-wrapper_y5cqm_167"><img src="https://v2-cp.ssscdn.com/ksc2/esu7LEeuMBzu_nWbDMvQyDRUJ0c8S71_t5sip5ja_bu0URLiBkpTISjmIgYA41vVTUIrvyMY5MXXtaPBB9jtfPx8ElOHm_zsPdjisVkT8926NX-_RjOsMHcPsk4F0XaMTgvmt-M2IsIJu4zPeRpfdA?pkey=AAWjSB4GGL2pZMnVnhoHJG-OiznkdiIoVQLAi09m1gV2tB0gEeO6HAgpxIi5qgKFi_m7-5J9E1gCMfDmOgjuHo_KryoqzToRvnRY14zQ7nGzL44JJp6tV55mCO9taoGYODY" alt=""><span class="_masks_y5cqm_167"></span></span></span></div><div class="_recommend-cover-item_y5cqm_157"><span style="width: 100%; height: 100%; display: inline-flex;"><span class="_masks-wrapper_y5cqm_167"><img src="https://v1-cp.ssrcdn.com/ksc2/-O40iRF8ld3RHFTsRBM4ro7sxvYxgCEL_kGFejtoPmGqtHNZQS80INQzHN0f2X7kjmdOFdAfaKyQYzgRZOy4Aguuht-mT94CIEl3C2RETkZ5uEDKcjnCp2n8P0zdLWxs9NYz-F6uHESFh2_KrYzqwA?pkey=AAVwE9rnCKIPrMdhbIDpEHtTrpFvYAS7gplG7MjNsiE28dPMmtIfaejXz5G_4bRc3rmlMz5MX6EyE1hXPG_XwepuCXdiveCZLEEDU157PSXG1knL_eQUbamC_JSX610cmWc" alt=""><span class="_masks_y5cqm_167"></span></span><div style="position: absolute; top: 0px; left: 0px; width: 100%;"><div><div class="ant-tooltip ant-tooltip-placement-top  ant-tooltip-hidden" style="left: -256px; top: -793px; transform-origin: 50% 298.281px; pointer-events: none;"><div class="ant-tooltip-content"><div class="ant-tooltip-arrow"><span class="ant-tooltip-arrow-content" style="--antd-arrow-background-color: #fff;"></span></div><div class="ant-tooltip-inner" role="tooltip" style="font-size: 12px; border-radius: 2px; padding: 4px; background: rgb(255, 255, 255);"><img class="_recommend-preview_y5cqm_241" src="https://v1-cp.ssrcdn.com/ksc2/-O40iRF8ld3RHFTsRBM4ro7sxvYxgCEL_kGFejtoPmGqtHNZQS80INQzHN0f2X7kjmdOFdAfaKyQYzgRZOy4Aguuht-mT94CIEl3C2RETkZ5uEDKcjnCp2n8P0zdLWxs9NYz-F6uHESFh2_KrYzqwA?pkey=AAVwE9rnCKIPrMdhbIDpEHtTrpFvYAS7gplG7MjNsiE28dPMmtIfaejXz5G_4bRc3rmlMz5MX6EyE1hXPG_XwepuCXdiveCZLEEDU157PSXG1knL_eQUbamC_JSX610cmWc" alt="" style="border-radius: 2px;"></div></div></div></div></div></span></div></div></div>
```

选择其中的第三张图片，并等待5秒：
```html
<span class="_masks-wrapper_y5cqm_167"><img src="https://v1-cp.ssrcdn.com/ksc2/-O40iRF8ld3RHFTsRBM4ro7sxvYxgCEL_kGFejtoPmGqtHNZQS80INQzHN0f2X7kjmdOFdAfaKyQYzgRZOy4Aguuht-mT94CIEl3C2RETkZ5uEDKcjnCp2n8P0zdLWxs9NYz-F6uHESFh2_KrYzqwA?pkey=AAVwE9rnCKIPrMdhbIDpEHtTrpFvYAS7gplG7MjNsiE28dPMmtIfaejXz5G_4bRc3rmlMz5MX6EyE1hXPG_XwepuCXdiveCZLEEDU157PSXG1knL_eQUbamC_JSX610cmWc" alt=""><span class="_masks_y5cqm_167"></span></span>

```

### 2.3 
添加到合集，点“选择要加入到的合集”下拉框，按名字选择合集，并点击“加入合集”按钮

代码：
```html

下拉框：

<input type="search" autocomplete="off" class="ant-select-selection-search-input" role="combobox" aria-haspopup="listbox" aria-owns="rc_select_5_list" aria-autocomplete="list" aria-controls="rc_select_5_list" aria-activedescendant="rc_select_5_list_0" readonly="" unselectable="on" value="" style="opacity: 0;" id="rc_select_5">


下拉选项：
<div class="rc-virtual-list" style="position: relative;"><div class="rc-virtual-list-holder" style="max-height: 256px; overflow-y: hidden; overflow-anchor: none;"><div><div class="rc-virtual-list-holder-inner" style="display: flex; flex-direction: column;"><div label="小动物" aria-selected="false" class="ant-select-item ant-select-item-option"><div class="ant-select-item-option-content"><div class="_options_ggsh0_1"><span class="_options-title_ggsh0_6">小动物</span><span class="_options-number_ggsh0_9">包含4个视频</span></div></div><span class="ant-select-item-option-state" unselectable="on" aria-hidden="true" style="user-select: none;"></span></div><div label="随手一拍" aria-selected="false" class="ant-select-item ant-select-item-option"><div class="ant-select-item-option-content"><div class="_options_ggsh0_1"><span class="_options-title_ggsh0_6">随手一拍</span><span class="_options-number_ggsh0_9">包含7个视频</span></div></div><span class="ant-select-item-option-state" unselectable="on" aria-hidden="true" style="user-select: none;"></span></div><div label="日语英语对照学" aria-selected="false" class="ant-select-item ant-select-item-option ant-select-item-option-active"><div class="ant-select-item-option-content"><div class="_options_ggsh0_1"><span class="_options-title_ggsh0_6">日语英语对照学</span><span class="_options-number_ggsh0_9">包含2个视频</span></div></div><span class="ant-select-item-option-state" unselectable="on" aria-hidden="true" style="user-select: none;"></span></div></div></div></div><div class="rc-virtual-list-scrollbar" style="width: 8px; top: 0px; bottom: 0px; right: 0px; position: absolute; display: none;"><div class="rc-virtual-list-scrollbar-thumb" style="width: 100%; height: 128px; top: 0px; left: 0px; position: absolute; background: rgba(0, 0, 0, 0.5); border-radius: 99px; cursor: pointer; user-select: none;"></div></div></div>
```


## 4. 点“发布”按钮，发布视频 
跳转到视频管理-待发布 页面
https://cp.kuaishou.com/article/manage/video?status=2&from=publish

"发布"按钮代码：
```html
<div class="_button_si04s_1 _button-primary_si04s_60" style="width: 96px; height: 36px;"><div>发布</div></div>
```


## 5.点左上角的“高清上传”-“发布视频” 【步骤1】
进入链接：
https://cp.kuaishou.com/article/publish/video?tabType=1

