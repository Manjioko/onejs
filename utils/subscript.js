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
                forFn(el, attr)
                break
            case 'if':
                // IfEventHanle.prototype.entry(el, attr)
                ifFn(el)
                break
            default:
                break
        }
    }

    // 解析 :evnet 事件
    doubleDotEventParse() { }
}

// 代理 handle
const handle = Object.freeze({
    get: function (target, key) {
        return Reflect.get(target, key)
    },
    set: function (target, key, value, receices) {
        console.log(`${key} 被赋值为`,value)
        if (Array.isArray(target)) {
            // 因为数组的 length 也会被触发，但是 length 这个属性的变化
            // 我们并不关心，所以忽略它
            if (key === 'length') return true
            let old_key = $flat.get(receices) || ''
            // console.log(old_key)
            let abs_key = old_key
            if (!old_key.startsWith('xdata.'))
                abs_key = 'xdata.' + old_key
            setTimeout(() => $bus.emit(abs_key.trim(), receices), 0)
        }
        if (xdata[key] !== undefined) {
            let abs_key = key
            if (!key.startsWith('xdata.'))
                abs_key = 'xdata.' + key
            setTimeout(() => $bus.emit(abs_key, value), 0)
        }
        if ($flat.get(receices)) {
            let abs_key = `xdata.${$flat.get(receices)}.${key}`
            setTimeout(() => $bus.emit(abs_key, value), 0)
        }
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
    // 保存 body 的初始结构
    window.$body = document.body.innerHTML
    // 开始解析HTML
    new ParseEle()
    // while (window.$stack.length) {
    //     const fn = window.$stack.shift()
        
    // }
    for (let fn of window.$stack) {
        fn()
    }
}

window.onload = function () {
    run()
}
