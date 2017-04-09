'use strict';

// 默认执行的时间 间隔（每秒60帧 17ms 左右）
var DEFAULT_INTERVAL = 1000 / 60;

/**
 * Timeline 状态定义
 */
// 初始状态
var STATE_INITIAL = 0;
// 开始状态
var STATE_START = 1;
// 停止状态
var STATE_STOP = 2;


/**
 * 定义 requestAnimationFrame 方法，实现兼容操作
 */
var requestAnimationFrame = (function(){
    return window.requestAnimationFrame || 
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        function (callback) {
            return window.setTimeout(callback, callback.interval || DEFAULT_INTERVAL);
        };
})();

/**
 * 清除 定时器 requestAnimationFrame 
 */
var cancelRequestAnimationFrame = (function(){
    return window.cancelAnimationFrame ||
        window.webkitCancelRequestAnimationFrame ||
        window.mozCancelRequestAnimationFrame ||
        window.oCanccelRequestAnimationFrame ||
        function (timerId) {
            return window.clearTimeout(timerId);
        };
})();

/**
 * Timeline 时间轴类
 */
function Timeline () {
    this.animationHandler = 0;
    this.state = STATE_INITIAL;
}

/**
 * 时间轴上每一次回调执行的函数
 * @param  {[type]} time 从动画开始到当前执行的时间
 */
Timeline.prototype.onenterFrame = function (time) {

}

/**
 * 让动画开始
 * @param  {[type]} interval 每一次回调它的间隔时间
 */
Timeline.prototype.start = function (interval) {

    if (this.state === STATE_START) {
        return;
    }
    this.state = STATE_START;
    this.interval = interval || DEFAULT_INTERVAL;

    // 开始this.start 方法，并传入当前时间
    // +new Date() 相当于 new Date().getTime();
    startTimeline(this, +new Date());
}

/**
 * 让动画停止
 */
Timeline.prototype.stop = function () {
    if (this.state !== STATE_START) {
        return;
    }
    this.state = STATE_STOP;

    // 如果动画开始过（即有记录startTime的情况下），
    // 则记录动画从开始到现在所经历的时间(this.dur)
    if (this.startTime) {
        this.dur = +new Date() - this.startTime;
    }
    cancelRequestAnimationFrame(this.animationHandler);
}

/**
 * 暂停的动画重新开始
 */
Timeline.prototype.resume = function () {
    if (this.state === STATE_START) {
        return;
    }
    if (!this.dur || !this.interval) {
        return;
    }

    this.state = STATE_START;

    // ！！去无缝连接动画，（好好理解下流程情况就懂了，很难备注）
    startTimeline(this, +new Date() - this.dur);
}

/**
 * 时间轴动画启动函数
 * @param  {[type]} timeline  时间轴实例
 * @param  {[type]} startTime 动画开始的时间戳
 */
function startTimeline (timeline, startTime) {

    // 记录上一次回调的时间戳
    var lastTick = +new Date();

    // 对timeline 的 startTime 进行记录
    timeline.startTime = startTime;
    nextTick.interval = timeline.interval;

    nextTick();

    // 对requestAnimationFrame 进行封装
    // 定义每一帧执行的函数
    function nextTick () {
        var now = +new Date();

        // 每一帧(17ms)执行的结果都用 timeline.animationHandler 保存
        timeline.animationHandler = requestAnimationFrame(nextTick);
        
        // ！！如果 当前时间(now)减去 上一次回调执行的时间(lastTick)，
        // 大于等于 设置的时间间隔(interval)时，
        // 则 timeline.onenterFrame 可以被执行
        if (now - lastTick >= timeline.interval) {
            timeline.onenterFrame(now - startTime);
            lastTick = now;
        }
    }
}

module.exports = Timeline;