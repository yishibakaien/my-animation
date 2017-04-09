'use strict';

var __id = 0;
/**
 * 动态创建id
 * @return {number} 
 */
function _getId () {
    return ++__id;
}
/**
 * 预加载图片的函数
 * @param  {[type]}   images   加载图片的数组
 * @param  {Function} callback 全部图片加载完毕后调用的回调函数
 * @param  {[type]}   timeout  加载超时的时长
 * @return {[type]}            [description]
 */
function loadimage (images, callback, timeout) {
    // 加载完成图片计数器
    var count = 0;
    // 全部图片加载成功的标志位
    var success = true;
    // 超时timer的id 
    var timeoutId = 0;
    // 是否超时标志位
    var isTimeout = false;

    // 对图片数组（或对象）进行遍历
    for (var key in images) {
        // ！！过滤prototype 上的属性，
        // 即当属性为自定义添加的images的属性时，进行下一次循环
        if (!images.hasOwnProperty(key)) {
            continue;
        }
        // 获得每个图片元素
        // 期望格式 object: {src: xxx} 
        var item = images[key];


        if (typeof item === "string") {
            item = images[key] = {
                src: item
            }
        }
        // 如果格式不满足期望（item为 "" 或undefined 等），
        // 则丢弃此条数据，进行下一次遍历
        if (!item || !item.src) {
            continue;
        }

        // 计数+1
        count++;

        // 设置图片元素id 
        item.id = "__img__" + _getId();

        // 设置图片元素的img 它是一个Image对象
        item.img = window[item.id] = new Image();

        doLoad(item);
    }

    // ！！如果count 没有进行++操作（如images是个空数组时）
    // 此次遍历计数为0（没有进行遍历），则直接调用callback
    if (!count) {
        callback(success);
    } else if (timeout) {
        timeoutId = setTimeout(onTimeout, timeout);
    }
    /**
     * 真正进行图片加载的函数
     * @param  {[type]} item 图片元素对象
     * @return {[type]}      [description]
     */
    function doLoad (item) {
        // 给图片设置状态 （AOP编程思想，在外部拿到这些对象时，
        // 可以清楚的知道这些对象此时的状态）
        item.status = 'loading';

        var img = item.img;

        // 绑定图片加载成功的回调函数
        img.onload = function () {
            // ！！当success出现 一次或一次以上false 时，success为false
            // 只有每次success 都为true 时，success 为true
            success = success && true;
            img.status = 'loaded';
            done();
        }
        // 绑定图片加载失败的回调函数
        img.onerror = function () {
            success = false;
            item.status = 'error';
            done();
        }

        // ！！真正发起一个http(s) 的图片请求
        img.src = item.src;

        /**
         * 每张图片加载完成后的回调函数，
         * 无论图片加载成功还是失败，都执行一次，
         * 主要做清理操作
         * @return {Function} [description]
         */
        function done () {
            img.onload = img.onerror = null;

            // 在图片加载完成时，清理window上的图片对象
            try {
                delete window[item.id];
            } catch (e) {

            }

            // ！！每次图片加载时，count 都会 执行++操作，
            // 如果 !--count = true 时(即--dcount 为 0时)，
            // 则表示图片加载完成了
            if (!--count && !isTimeout) {

                clearTimeout(timeoutId);
                callback(success);
            }
        }
    }

    /**
     * 超时函数
     * @return {[type]} [description]
     */
    function onTimeout () {
        isTimeout = true;
        callback(false);
    }
}

module.exports = loadimage;