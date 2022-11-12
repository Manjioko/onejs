// 解析元素结构的入口，也是整个页面变动的入口
class ParseEle {
    constructor() {
        this.forEachEle(document.body)
    }

    forEachEle(el) {
        // 保证 el 是一个 dom 节点
        if (!el && !el instanceof HTMLElement) return []
        // 分两层，一层是传入的 el, 一层是 el 的子元素
        this.parseAttributes(el)
        // 处理子元素
        this.childEleHanle(el)
    }

    childEleHanle(el) {
        // 子元素集合
        const child_arr = [...el.children]
        // 操作 child_arr 存储对应的数据结构或者做递归处理
        for (let child_el of child_arr) {
            this.parseAttributes(child_el)
            // 发现节点存在子节点则递归
            if (child_el.children.length) {
                this.childEleHanle(child_el)
            }
        }
    }

    // 用于解析 Attributes 并将 Attributes 里面的不同功能的事件分发到
    // 对应到不同的处理逻辑中，比如说 Attributes 里面存在 x-event 事件
    // 和 :event 事件，这就需要做分类处理，将其分发到不同的函数去做相应
    // 的处理
    parseAttributes(el) {
        const attrs = [...el.attributes]
        attrs.forEach(item => {
            // x-event 模式
            if (item.name.startsWith('x-')) {
                // 交由 ParseDiffEvent 处理其不同的事件，比如 if 和 for 事件
                ParseDiffEvent.prototype.xEventParse(el, item)
            }
            // :event 模式
            if (item.name.startsWith(':')) {
                // 交由 ParseDiffEvent 处理其不同的事件，比如 if 和 for 事件
                ParseDiffEvent.prototype.doubleDotEventParse(el, item)
            }
        })
    }
}

// 属性包含的不同事件在这里分发，这个类负责将不同事件
// 分发到不同的处理逻辑去
class ParseDiffEvent {
    constructor() { }

    // 解析 x-evnet 事件
    xEventParse(el, attr) {
        const name = attr.name.slice(2)
        switch (name) {
            case 'for':
                // console.log(el)
                // ForEventHanle.prototype.entry(el, attr)
                this.forFn(el, attr)
                break
            case 'if':
                // IfEventHanle.prototype.entry(el, attr)
                this.ifFn(el)
                break
            default:
                break
        }
    }

    forFn(el, attr) {
        // 设置节点ID
        const id = 'x-' + IDGenerator()
        el.setAttribute(id,'')
        // 取出 for 结构体
        const forStr = el.getAttribute('x-for')
        el.removeAttribute('x-for')
        // 解析 for 字符串
        // x-for 的字符串
        const strCMD = this.parseStr(attr.value)
        // x-for 的遍历值部分
        const leftData = this.parseItem(strCMD.item)
        // x-for 数组部分
        const ary = runStrcmd(strCMD.body)

        const cb = function() {
            console.log(id)
        }
        console.log($flat.get(ary))
        $bus.on($flat.get(ary), cb)
        $stack.unshift(cb)
    }
    ifFn(el) {
        el.setAttribute('x-' + IDGenerator(),'')
        el.removeAttribute('x-if')
    }

    // 解析 :evnet 事件
    doubleDotEventParse() { }

    // 解析字符串需要的方法
    parseStr(str) {
        if (str.includes('in')) {
            let str_ary = str.split('in')
            let item = str_ary[0].trim()
            let body = str_ary[1].trim()
            return { item, body }
        }

        return { item: '', body: '' }
    }
    parseItem(item) {
        const hasBrace = /\(.+\)/.test(item)
        if (hasBrace) {
            const unwrapBrace = item.match(/\((.+)\)/)[1]
            const hasComma = unwrapBrace.includes(',')
            if (hasComma) {
                const itemSplit = unwrapBrace.split(',')
                return { item: itemSplit[0].trim(), index: itemSplit[1].trim() }
            } else {
                return { item: unwrapBrace, index: '' }
            }
        }
        return { item: item, index: '' }
    }
}

// 代理 handle
const handle = Object.freeze({
    get: function (target, key) {
        // if (typeof target[key] === 'object' && target[key] !== null) {
        //     return new Proxy(target[key], handle)
        // }
        return Reflect.get(target, key)
    },
    set: function (target, key, value, receices) {
        console.log(`${key} 被赋值为 ${value}`)
        return Reflect.set(target, key, value, receices)
    }
})





// 程序入口
function run() {
    // 用于存放解析后的节点绑定的构造函数
    window.$stack = []
    // 事件订阅发布
    window.$bus = new EventEmiter()
    // 代理 xdata
    window.xdata = deepProxy(window.xdata, handle)
    // 平铺 xdata 嵌套数据
    window.$flat = flatObjectFrom2Level(window.xdata)
    // 开始解析HTML
    new ParseEle()
}

window.onload = function() {
    run()
}
