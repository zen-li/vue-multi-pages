var path = require('path')
var fs = require('fs')
var glob = require('glob')
var HtmlWebpackPlugin = require('html-webpack-plugin')


var jsEntries = null
var pages = null
var __init = false

var defaultPageRootDir = './src/pages'
var defaultOption = {
    js: 'index.js',
    html: 'index.html'
}

var getEntries = function (rootDir) {
    var entries = {}

    glob.sync(rootDir).forEach(function (entry) {
        var tmp = entry.split('/').splice(-3)
        var moduleName = tmp.slice(1, 2)
        entries[moduleName] = entry
    })

    return entries
}

var init = function (pageRootDir, option) {
    if (typeof pageRootDir === 'object') {
      option = pageRootDir
    }

    pageRootDir = typeof pageRootDir === 'string' && pageRootDir !== ''
      ? pageRootDir
      : defaultPageRootDir
    pageRootDir = path.join(process.env.PWD, pageRootDir)
    if (pageRootDir.indexOf (pageRootDir.length - 1) === '/') {
      pageRootDir = pageRootDir.substr(0, pageRootDir.length - 1)
    }

    option = option || defaultOption
    option.js = option.js || defaultOption.js
    option.html = option.html || defaultOption.html

    jsEntries = getEntries(pageRootDir + '/**/' + option.js)
    pages = getEntries(pageRootDir + '/**/' + option.html)
    __init = true
}


var register = function (webpackConfig) {
    if (!__init) {
        throw new Error('[vue-multi-pages]: please call the init() method first.')
    }

    webpackConfig.entry = jsEntries

    // 提取并清除 vue-cli 的默认入口
    var vueDefaultEntryHTMLPluginOption = null
    var plugins = webpackConfig.plugins
    for (var index in plugins) {
      var option = plugins[index]
      if (option.options && option.options.template && option.options.template) {
          vueDefaultEntryHTMLPluginOption = option
          plugins.splice(index, 1)
          break
      }
    }

    // 处理项目入口
    var htmlPluginOptionForProduction = {
        minify: {
            removeComments: true,
            collapseWhitespace: true,
            removeAttributeQuotes: true
        },
        env: Object.assign({}, vueDefaultEntryHTMLPluginOption.options.env, {
            NODE_ENV: process.env.NODE_ENV
        })
    }

    for (var page in pages) {
        var conf = {
            filename: page + '.html',
            template: pages[page],
            inject: true,
            chunksSortMode: 'dependency',
            excludeChunks: Object.keys(pages).filter(function (item) {
              return (item !== page)
            })
        }

        if (process.env.NODE_ENV !== 'development') {
            conf = Object.assign({}, conf, htmlPluginOptionForProduction)
        }

        plugins.push(new HtmlWebpackPlugin(conf))
    }


    for (var index in plugins) {
        option = plugins[index]
        if (option.chunkNames && option.minChunks) {
            if (option.chunkNames.indexOf('app') !== -1) {
                option.chunkNames.splice(option.chunkNames.indexOf('app'), 1)
            }
            option.chunkNames = option.chunkNames.concat(Object.keys(pages))
            break
        }
    }
}

// var listen = function (app) {
//     if (!__init) {
//         throw new Error('[vue-multi-pages]: please call the init() method first.')
//     }

//     for (var page in pages) {
//         app.get('/' + page, function(req, res) {
//             // res.redirect('/' + page + '.html');
//             res.send('src/pages/' + page + '/index.html')
//         });
//     }
// }

module.exports = {
    init,
    register,
    // listen
}
