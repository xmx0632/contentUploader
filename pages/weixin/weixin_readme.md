# 微信视频号上传操作文档

## 最新更新
- 2025-05-20: 移除了多余的上传控件选择器代码，直接使用Shadow DOM选择器定位上传控件，提高代码效率和可靠性

0.如果还没有登录的时候，页面会跳转到 https://channels.weixin.qq.com/login.html
需要等用户扫描二维码登录成功之后再开始上传文件，
二维码：
document.querySelector("#app > div > div.login-qrcode-wrap.qrcode-iframe-wrap.dark.dark > div > div.qrcode-wrap > img")

1.视频描述
	document.querySelector("#container-wrap > div.container-center > div > wujie-app").shadowRoot.querySelector("#container-wrap > div.container-center > div > div > div.main-body-wrap.post-create > div.main-body > div > div.post-edit-wrap.material-edit-wrap > div.form > div:nth-child(2) > div.form-item-body > div > div.input-editor")

    输入从配置读到的描述信息

2.点击 “添加到合集”
    document.querySelector("#container-wrap > div.container-center > div > wujie-app").shadowRoot.querySelector("#container-wrap > div.container-center > div > div > div.main-body-wrap.post-create > div.main-body > div > div.post-edit-wrap.material-edit-wrap > div.form > div:nth-child(4) > div.form-item-body > div > div.post-album-display > div > div.tip > span")

    2.1 选择“日语英语对照学”（从配置读取的）下拉框：
    document.querySelector("#container-wrap > div.container-center > div > wujie-app").shadowRoot.querySelector("#container-wrap > div.container-center > div > div > div.main-body-wrap.post-create > div.main-body > div > div.post-edit-wrap.material-edit-wrap > div.form > div:nth-child(4) > div.form-item-body > div > div.filter-wrap > div.common-option-list-wrap.option-list-wrap > div:nth-child(3) > div > div.name")


3.勾选 “声明原创” 复选框，然后会弹出对话框
    document.querySelector("#container-wrap > div.container-center > div > wujie-app").shadowRoot.querySelector("#container-wrap > div.container-center > div > div > div.main-body-wrap.post-create > div.main-body > div > div.post-edit-wrap.material-edit-wrap > div.form > div:nth-child(9) > div.form-item-body > div > label > span.ant-checkbox > input")


4.勾选复选框：
    document.querySelector("#container-wrap > div.container-center > div > wujie-app").shadowRoot.querySelector("#container-wrap > div.container-center > div > div > div.main-body-wrap.post-create > div.main-body > div > div.post-edit-wrap.material-edit-wrap > div.form > div:nth-child(9) > div.declare-original-dialog > div.weui-desktop-dialog__wrp > div > div.weui-desktop-dialog__bd > div > div.original-proto-wrapper > label > span > input")

5.点击“声明原创”按钮

    document.querySelector("#container-wrap > div.container-center > div > wujie-app").shadowRoot.querySelector("#container-wrap > div.container-center > div > div > div.main-body-wrap.post-create > div.main-body > div > div.post-edit-wrap.material-edit-wrap > div.form > div:nth-child(9) > div.declare-original-dialog > div.weui-desktop-dialog__wrp > div > div.weui-desktop-dialog__ft > div:nth-child(2) > button")

6.然后点击“发表” 按钮：

    document.querySelector("#container-wrap > div.container-center > div > wujie-app").shadowRoot.querySelector("#container-wrap > div.container-center > div > div > div.main-body-wrap.post-create > div.main-body > div > div.post-edit-wrap.material-edit-wrap > div.form > div.form-btns > div:nth-child(5) > span > div > button")


