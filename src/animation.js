'use strict'
var Timeline = require('./timeline.js')
var loadImage = require('./imageloader.js')

/**
 * animation执行状态定义
 */
// 初始化状态
var STATE_INITIAL = 0
// 开始状态
var STATE_START = 1
// 停止状态
var STATE_STOP = 2

/**
 * 任务链类型定义（两种：同步、异步）
 */
// 同步任务
var TASK_SYNC = 0
// 异步任务
var TASK_ASYNC = 1

/**
 * 默认异步任务执行间隔时间
 */
var DEFAULT_INTERVAL = 80

/**
 * 简单的函数包装，执行callback
 * @param  {Function} callback 执行的函数
 */
function next(callback) {
  callback && callback()
}

/**
 * [Animation description] 帧动画库类
 */
function Animation() {
  // 任务链
  this.taskQueue = []

  this.timeline = new Timeline()

  // animation 的状态
  this.state = STATE_INITIAL

  // ！！当前任务索引 （用于维护任务链的索引值）
  this.index = 0
}

/**
 * 添加一个同步任务，去预加载图片,
 * 需求分析：传递一个图片数组，进行加载，
 * 通过回调函数通知加载结果
 * @param  {[type]} imgList 图片数组
 * @return {[type]}         返回this._add()
 */
Animation.prototype.loadImage = function (imgList) {
  var taskFn = function (next) {
    // slice() 深拷贝数组，创建一个imgList 副本，
    // 对副本进行操作，避免影响原数组
    // ！！next 作为回调函数，
    // 传给 loadImage方法，(即loadImage中的第二个参数 callback)
    loadImage(imgList.slice(), next)
  }
  var type = TASK_SYNC

  return this._add(taskFn, type)
}

/**
 * 网任务链上添加异步定时任务，
 * 通过定时改变图片背景位置，实现帧动画
 * @param  {[type]} ele       dom对象
 * @param  {[type]} positions 背景位置数组
 * @param  {[type]} imageUrl  图片地址
 * @return {[type]}           返回this._add();
 */
Animation.prototype.changePosition = function (ele, positions, imageUrl) {
  var len = positions.length
  var taskFn
  var type

  // 如果有长度，则是一个真正的异步定时任务
  if (len) {
    var _this = this
    /**
     * [taskFn description]
     * @param  {Function} next 帧动画执行完后执行的回调方法
     * @param  {[type]}   time 帧动画开始到现在执行的时间
     * @return {[type]}        [description]
     */
    taskFn = function (next, time) {
      if (imageUrl) {
        ele.style.backgroundImage = 'url(' + imageUrl + ')'
      }
      // 获得当前图片背景位置索引
      // | 0 : 相当于Math.floor，相率更高
      // len : 由于 time可能很大，所以规定要小于 len，
      // 也就是说 索引值不能超过len
      var index = Math.min((time / _this.interval) | 0, len)
      var position = positions[index - 1].split(' ')
      // 改变dom对象的背景图片位置
      ele.style.backgroundPosition = position[0] + 'px ' + position[1] + 'px'

      // 当动画进行到最后一帧时
      if (index === len) {
        next()
      }
    }
    type = TASK_ASYNC
  }
  // 如果没有长度
  else {
    // 全局的next 方法
    taskFn = next
    type = TASK_SYNC
  }

  // 将 taskFn 和 type 添加到任务队列，并返回出去
  return this._add(taskFn, type)
}

/**
 * 添加一个异步定时任务，通过定时改变img标签的src属性，
 * 实现帧动画
 * @param  {[type]} ele     image 标签
 * @param  {[type]} imgList 图片数组
 * @return {[type]}         返回this._add()
 */
Animation.prototype.changeSrc = function (ele, imgList) {
  var len = imgList.length
  var taskFn
  var type

  if (len) {
    var _this = this
    taskFn = function (next, time) {
      // 获得当前图片索引
      var index = Math.min((time / _this.interval) | 0, len)
      // 改变image对象的图片地址
      ele.src = imgList[index - 1]
      if (index === len) {
        next()
      }
    }
    type = TASK_ASYNC
  } else {
    taskFn = next
    type = TASK_SYNC
  }

  return this._add(taskFn, type)
}

/**
 * 高级用法，添加一个异步定时执行的任务，
 * 该任务自定义动画每帧执行的任务函数
 * @param  {[type]} taskFn 自定义每帧执行的任务函数
 * @return {[type]}        返回this._add()
 */
Animation.prototype.enterFrame = function (taskFn) {
  return this._add(taskFn, TASK_ASYNC)
}

/**
 * 添加一个同步任务，在上一个任务完成后，
 * 执行回调函数
 * @param  {Function} callback [description]
 * @return {[type]}            返回this._add()
 */
Animation.prototype.then = function (callback) {
  // then 是一个同步任务，只需要接收一个参数 next
  var taskFn = function (next) {
    callback()
    next()
  }
  var type = TASK_SYNC
  return this._add(taskFn, type)
}

/**
 * 开始执行任务
 * @param  {[type]} interval 异步定时任务执行的间隔
 * @return {[type]}          返回animation实例
 */
Animation.prototype.start = function (interval) {
  // 如果animation已经是开始状态，则直接返回实例
  if (this.state === STATE_START) {
    return this
  }
  // 如果任务链数组 taskQueue 为空（没有任务），
  // 则直接返回实例
  if (!this.taskQueue.length) {
    return this
  }
  // 设置animation状态为 开始状态
  this.state = STATE_START

  // 将interval 保存到类中
  this.interval = interval || DEFAULT_INTERVAL

  // 开始执行任务
  this._runTask()

  // 返回实例（链式调用）
  return this
}

/**
 * 添加一个同步任务，该任务回退到上一个任务，
 * 实现重复上一个任务的效果，可以定义重复的次数
 * @param  {[type]} times 重复次数
 * @return {[type]}       返回this._add();
 */
Animation.prototype.repeat = function (times) {
  var _this = this
  var taskFn = function () {
    // 没有传入times 时，相当于无线循环
    if (typeof times === 'undefined') {
      // 无限回退到上一个任务
      // 这里的 this.index-- 的操作，实现了切换到上一个任务，
      _this.index--
      _this._runTask()

      // 及时停止，不往下执行
      return
    }

    if (times) {
      times--
      // 回退
      _this.index--
      _this._runTask()
    }
    // times为 0 ，（达到了重复的次数）
    else {
      var task = _this.taskQueue[_this.index]
      _this._next(task)
    }
  }
  var type = TASK_SYNC

  return this._add(taskFn, type)
}

/**
 * 添加一个同步任务，相当于preaet()更友好的接口，
 * 无线循环上一次任务
 * @return {[type]} 返回animation.repeat()
 */
Animation.prototype.repeatForever = function () {
  return this.repeat()
}

/**
 * 设置当前任务执行结束后，到下一个任务开始前的等待时间
 * @param  {[type]} time 等待时长
 */
Animation.prototype.wait = function (time) {
  if (this.taskQueue && this.taskQueue.length > 0) {
    this.taskQueue[this.taskQueue.length - 1].wait = time
  }
  return this
}

/**
 * 暂停当前异步定时任务
 * @return {[type]} 返回animation实例
 */
Animation.prototype.pause = function () {
  if (this.state === STATE_START) {
    this.state = STATE_STOP
    this.timeline.stop()
    return this
  }
  return this
}

/**
 * 重新执行上一次暂停的异步任务
 * @return {[type]} 返回animation实例
 */
Animation.prototype.resume = function () {
  if (this.state === STATE_STOP) {
    this.state = STATE_START
    this.timeline.resume()
    return this
  }
  return this
}

/**
 * 释放资源（计时器，raf 对象等）
 * @return {[type]} 返回animation实例
 */
Animation.prototype.dispose = function () {
  if (this.state !== STATE_INITIAL) {
    this.state = STATE_INITIAL
    this.taskQueue = null
    this.timeline.stop()
    this.timeline = null
    return this
  }
  return this
}

/**
 * 内部使用方法，
 * 添加一个任务到任务队列
 * @param {[type]} taskFn 任务方法
 * @param {[type]} type   任务类型
 */
Animation.prototype._add = function (taskFn, type) {
  // 往任务队列taskQueue数组中 添加一个任务对象
  this.taskQueue.push({
    taskFn: taskFn,
    type: type,
  })

  // ！！链式调用关键，
  // 返回Animation 实例，以实现链式调用
  return this
}

/**
 * 内部使用方法，
 * 执行任务
 */
Animation.prototype._runTask = function () {
  // 如果任务队列为空 或 animation状态 不为开始状态，
  // 直接结束
  if (!this.taskQueue || this.state !== STATE_START) {
    return
  }
  // 任务执行完毕时，释放资源，并结束
  if (this.index === this.taskQueue.length) {
    this.dispose()
    return
  }

  // 获得任务链上当前任务对象 ({taskFn: taskFn, type: type})
  var task = this.taskQueue[this.index]

  // 如果任务类型为同步任务
  // 执行this._add 方法时，已经将任务类型(type)添加到task中
  if (task.type === TASK_SYNC) {
    this._syncTask(task)
  }
  // 否则如果任务类型为异步任务
  else if (task.type === TASK_ASYNC) {
    this._asyncTask(task)
  }
}

/**
 * 内部使用方法，
 * 执行同步任务，
 * 起到 切换到下一个任务 函数 (this._next) 的桥接作用
 * @param  {[type]} task 执行的任务对象
 */
Animation.prototype._syncTask = function (task) {
  var _this = this
  var next = function () {
    _this._next(task)
  }

  var taskFn = task.taskFn

  // ！！切换到下一个任务，
  // 将 next 作为参数（回调函数）传入taskFn，
  // 来实现切换到下一个任务
  taskFn(next)
}

/**
 * 内部使用方法，
 * 执行异步任务，
 * ！！控制异步操作（每帧动画）的关键操作，
 * 具体通过 timeline(.js) 实现
 * @param  {[type]} task 执行的任务对象
 */
Animation.prototype._asyncTask = function (task) {
  var _this = this
  /**
   * 定义每一帧执行的回调函数，
   * Timeline实例里面的 Timeline.onenterFrame
   * @param  {[type]} time 从动画开始到当前执行的时间
   */
  var enterframe = function (time) {
    var taskFn = task.taskFn
    var next = function () {
      // 停止当前任务
      _this.timeline.stop()
      // 执行下一个任务
      _this._next(task)
    }
    taskFn(next, time)
  }
  this.timeline.onenterFrame = enterframe
  this.timeline.start(this.interval)
}

/**
 * 内部使用方法，
 * 切换到下一个任务
 * ！！拓展支持：如果当前任务需要等待（taskQueue 有wait属性时），
 * 则延时执行，（在这里实现this.wait）
 * @param {[type]} task 当前任务
 */
Animation.prototype._next = function (task) {
  var _this = this
  // 将任务队列索引值++，同时调用 this._runTask，
  // 执行到这一步时，任务又回到了this._runTask，
  // ！！此时，这里的 this.index++ 的操作，实现了切换到下一个任务，
  // 整个任务链就被串起来了
  this.index++

  if (task.wait) {
    setTimeout(function () {
      _this._runTask()
    }, task.wait)
  } else {
    this._runTask()
  }
}

module.exports = function () {
  return new Animation()
}
