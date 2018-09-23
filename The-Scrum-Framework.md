# 什么是Scrum?

Scrum是一种敏捷(Agile)开发方法。事实上，Agile是一个思想，而不是某一个具体的方法论，敏捷方法包含很多具体的方法论或框架：

* Agile Unified Process,
* Behaviour Driven Development (BDD),
* Crystal Clear,
* Dynamic Systems Development Method (DSDM),
* Extreme Programming (XP)
* Feature Driven Development (FDD),
* Kanban
* Lean Development,
* Rapid Application Development (RAD),
* IBM - Rational Unified Process (RUP),
* **Scrum**,
* Test Driven Development (TDD).

具体地，Scrum可以被描述为：

> framework within which you can employ various processes and techniques

Scrum框架是基于团队的(team based)的迭代开发方法，并且定义了相关的角色(role)、事件(events)、artefacts和规则(rules)，其中角色(roles)主要包括三类：product owner, scrum master, the team.

# Scrum框架结构

## 几个概念

* **Project Backlog**: 定期更新的项目待办事项列表，用来整理项目的需求；
* **User Story**: 与上述需求相关的特性(features)；
* **Sprint**: 一个Sprint就是一个1-4周的事件，专注于开发和交付当前阶段要完成User Story；
* **Task**: 为了交付一个User Story所需要完成的活动(activities)。

关于Scrum的结构，需要明白三层结构的概念：**Project, Iterations, Tasks**. 总的来说，一个Scrum项目(Project)包含多个迭代(Iterations)，一个迭代(Iteration)又包含多个任务(Tasks)。

> 这里的Iteration我觉得就是Sprint

![Scrum Framework](https://github.com/txsun1997/XDU-SPM-Project/blob/master/Scrum.jpg)

1. 首先，一个Scrum Project有一个Project Backlog，这个Project Backlog中包含了一系列需求，按照上课的时候老师的意思，这些需求应该包含functions和features，functions是指这个软件的功能或目的，而features是指该软件要完成对应的功能所使用的工具或方法，例如实现微信登录这是一个function，而通过输入账号密码登录还是扫描二维码登录就是两个不同的features。按照定义，User Stories就是features，也就是说，在Project Backlog中，不仅要声明软件需要完成的功能需求，还要声明对应需求的特性。

2. 一个Scrum Project被划分为多个1-4周的Iterations(实际上我觉得Iterations/cycles/sprint说的是一回事)，相应的，Project Backlog也被划分为多个Iteration Backlog，每个Iteration Backlog是Project Backlog的一个子集，规定了当前迭代需要交付的东西。Iteration Backlog是由商务和项目团队共同评估User Stories的优先级来制定。

3. 在每个Iteration中，有三个固定时长的会议，第一个会议在迭代的开始，叫做**sprint planning meeting**，该会议确定这一轮迭代要开发的特性以及优先级；第二个会议在迭代的最后，叫做**iteration review**，该会议将审查产品，现场展示软件的使用；第三个会议在第二个会议之后，叫**iteration retrospective**，在该会议上，团队将反思、总结和提升迭代过程本身。另外，每天还有一个daily stand-up meeting，理想情况下上面提到的三个角色（team,  scrum master, product owner）都要参与。

