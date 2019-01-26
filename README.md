# XDU-SPM-Project
The _Software Project Organization And Management_ course project at Xidian University.

## 项目地址

http://tristone.wang/reader/index.html

示例图片：

![img1](https://github.com/txsun1997/XDU-SPM-Project/blob/master/index.png)

![img2](https://github.com/txsun1997/XDU-SPM-Project/blob/master/booklist.png)

## 要求
* Web-based Project (B/S Architecture)
* Complete in 7 Weeks
* Use Scrum Development Process

## 资料

百度云盘：https://pan.baidu.com/s/1OwO0cqv4kAs1Sdc-sQVKUw

提取密码：bes3

----

# Backlog

## Product Backlog

### Admin
- 登入&登出
- 修改密码
- 添加librarian，密码默认为00010001
- 管理（编辑/删除）librarian
- 修改书籍逾期罚金（默认为1元/天）
- 修改书籍归还期限（默认为30天）
- 修改读者注册时缴纳的保证金（默认为300元）
- 搜索librarian，查看librarian列表
- 帮助librarian找回密码

### Librarian
- 登入&登出
- 修改密码
- 注册reader，手机号为用户名，密码默认为12345678
- 管理（编辑/删除）reader，删除时须确保罚金已还清&书已归还（删除条件未调整）
- 加书（位置和价格必需），生成条形码（位置未从后端读入）
- 编辑书籍信息
- 删除书籍，精确到书籍&副本，保存和浏览删除书籍的操作记录（包含操作人）
- 搜书
- 借书（一个账号最多同时借阅3本书）
- 还书
- 浏览reader的借书、还书、罚金记录（未显示当前待支付金额）
- 浏览图书馆收入记录（按天/月/年），收入包含保证金和罚金
- 添加/编辑/删除主页的公告
- 添加/编辑书籍类别
- 添加/编辑/删除位置
- 在admin的帮助下找回密码

### Reader
- 登入/登出
- 修改个人信息和密码
- 查书
- 预约2小时
- 浏览借书、还书、缴纳罚金记录和当前待支付罚金
- 书籍到期前收到邮件提醒
- 通过邮件找回密码

## 其他

* 须包含英文界面
* 使用产品LOGO
* 须有页眉页脚
* 主页须有：搜索、登录、公告
* 须测试所有输入的空值和错误值
* 隐藏Admin登录界面

## Final Tasks

### DOC
- [x] Lab 1&2
- [x] Lab 3&4
- [x] User Manual（STX）
- [x] Readme（WL）
- [x] Vedio（LISH）

### ALL
- [x] 删除操作前加询问框（WL, WQX, JC）
- [x] 进行空值和错误值测试
- [ ] 邮件发送的问题再改进一下（特别是163邮箱），用西电邮箱是可以接收到的（YTH）
- [x] 部署（WL）
- [x] 对照需求ppt测试（STX, WL, JC, YTH）
- [ ] 测试一下哪些浏览器被支持（YTH）
- [x] 空值搜索显示全部结果

### Librarian
- [x] 找回密码提交后应有反馈（WL）
- [x] 做主页，显示公告（STX）
- [x] 条形码在小窗口显示无法打印，显示在新标签页（WL）
- [x] 检查location和category管理，删除/刷新有问题（WCX, GY）
- [X] 添加/编辑/删除后自动刷新列表（WL）
- [x] 把admin登录功能从librarian登陆界面删除
- [x] post news用新的框架
- [x] income detail表美化一下

### Reader
- [x] 主页上面加一个按钮Librarian，提供librarian的登录入口（WQX, HAM）
- [x] UI统一和改进，比如三个小人下栏菜单的统一（WQX）
- [x] Profile界面Male Female不能改（JC）
- [x] News只能显示4条，点击不对应，正文字体需调整（HAM, WQX）
- [x] 主页展示书的功能（HAM, WQX）
- [x] 页码问题（WQX, HAM）
- [x] 主页公告无法点击（WQX, HAM）
- [x] 预约功能调整（WQX, HAM, JC）
- [x] 修复罚金异常问题

### Admin
- [x] 删除原来的搜索librarian，调整为一个搜索框，可以根据账号、姓名、电话来检索，支持子串搜索
- [x] 重做一个登录界面，只能通过地址访问（STX）
- [x] Message有高亮显示未读消息数目（STX, WL）
- [x] 添加/编辑/删除后自动刷新列表（WL）

## Release 3

### Admin
- [ ] 根据姓名或用户名搜索librarian，支持子串搜索
- [x] 帮助librarian找回密码（完成消息系统，入口在主页面右上角的Message按钮，向忘记密码的librarian自动发送邮件）
- [ ] 重做登录界面，隐藏入口（页面通过地址栏输入，librarian和reader通过reader的index登录，admin通过原admin&librarian的login页面登录）
- [ ] 删除前添加询问框确认删除
- [ ] 错误提示/处理：所有输入框测试空值、错误值

### Librarian
- [x] 改进搜书功能，一个输入框，可以根据作者、书名检索，支持子串搜索
- [x] 整合借还书和预约的业务逻辑，还书时输入barcode自动填充借阅人的电话、姓名
- [x] 浏览图书馆收入记录（按天/月/年，收入包含保证金和罚金，做可视化如柱状图、折线图，我这里有Amaze UI相关组件的demo）
- [x] ISBN调用豆瓣API，豆瓣书库中没有的需手动输入信息，也可以无ISBN（比如很多年前的书）
- [x] 添加/编辑/删除主页的公告
- [x] 添加/编辑书籍类别（Category）
- [x] 添加/编辑/删除位置（Location）
- [x] 在admin的帮助下找回密码（向admin的消息系统发送请求，等待重置密码的邮件通知）
- [ ] 删除前添加询问框确认删除
- [ ] 错误提示/处理：所有输入框测试空值、错误值

### Reader
- [x] 完善预约功能，整合借还书方面的业务逻辑
- [ ] 主页面公告栏
- [ ] 将librarian的登录界面整合到reader登录界面
- [x] 书籍到期前邮件提醒
- [x] 主页面搜索框赋予实际功能或删除（建议想办法完成，即使是笨方法）
- [ ] 主页面下方展示部分图书功能做完或删除
- [ ] 主页面logout和console放在user图标的下拉框里
- [ ] 主页面右上角添加message（与搜索页面保持一致）或删除搜索页面的message
- [ ] 错误提示/处理：所有输入框测试空值、错误值

## Release 2

- [x] 重构主页，合并登录界面

### Admin
- [x] 删除图书管理、图书搜索、读者管理、修改个人信息功能
- [x] 修改添加librarian功能，默认密码改为00010001
- [x] 搜索librarian并查看librarian列表
- [x] 修改书籍逾期罚金（默认为1元/天）
- [x] 修改书籍归还期限（默认为30天）
- [x] 修改读者注册时缴纳的保证金（默认为300元）

### Librarian
- [x] 修改添加reader功能，手机号做用户名，12345678做默认密码
- [x] 修改加书功能，位置改为楼层+房间+书架号（多个选择框），添加价格
- [x] 条形码应基于图书信息生成，改进条形码打印功能
- [x] 管理（编辑/删除）reader，删除时须确保罚金已还清&书已归还
- [x] 编辑书籍信息
- [x] 删除书籍，精确到书籍&副本，保存和浏览删除书籍的操作记录（包含操作人）
- [x] 搜书
- [x] 浏览reader的借书、还书、罚金记录
- [x] 借书（一个账号最多同时借阅3本书）
- [x] 还书

### Reader
- [x] 改进搜书功能，要求能够根据任意关键词搜索
- [x] 浏览借书、还书、缴纳罚金记录和当前待支付罚金
- [x] 预约2小时
- [x] 通过邮件找回密码

## Release 1

### Admin
- [x] 登入
- [x] 登出
- [x] 个人信息管理+修改密码
- [x] 添加librarian（系统自动分配ID，密码默认置为123456）
- [x] 列表展示librarian, reader, book
- [x] 编辑Librarian信息（可选）

### Librarian
- [x] 登入
- [x] 登出
- [x] 个人信息管理+修改密码
- [x] 添加reader（系统自动分配ID，密码默认置为123456）
- [x] 添加图书（支持打印条形码）
- [x] 列表展示reader

### Reader
- [x] 登入
- [x] 登出
- [x] 个人信息管理+修改密码
- [x] 根据书名、作者查找图书
- [x] 查看某本书的位置和详细信息
