
module.exports = {
    entry: {
        animation: './src/animation.js'
    },
    output: {
        path: __dirname + '/build',
        filename: '[name].js',
        // 会在全局（window）下，注册一个animation对象
        library: 'animation',
        libraryTarget: 'umd'
    }
}