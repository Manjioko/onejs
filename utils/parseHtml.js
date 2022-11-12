// 解析元素结构的入口，也是整个页面变动的入口
class ParseEle {
    constructor() { }

    forEachEle(el, key, fn) {
        // 保证 el 是一个 dom 节点
        if (!el && !el instanceof HTMLElement) return []
        // 分两层，一层是传入的 el, 一层是 el 的子元素
        fn?.(el, key) ?? this.parseAttributes(el)
        // 处理子元素
        this.childEleHanle(el, key, fn)
    }

    childEleHanle(el, key, fn) {
        // 子元素集合
        const child_arr = [...el.children]
        // 操作 child_arr 存储对应的数据结构或者做递归处理
        for (let child_el of child_arr) {
            fn?.(child_arr, key) ?? this.parseAttributes(child_el)
            // 发现节点存在子节点则递归
            if (child_el.children.length) {
                this.childEleHanle(child_el, key, fn)
            }
        }
    }

    // 用于解析 Attributes 并将 Attributes 里面的不同功能的事件分发到
    // 对应到不同的处理逻辑中，比如说 Attributes 里面存在 x-event 事件
    // 和 :event 事件，这就需要做分类处理，将其分发到不同的函数去做相应
    // 的处理
    parseAttributes(el) {
        [...el.attributes].forEach(item => {
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
                ForEventHanle.prototype.entry(el, attr)
                break
            case 'if':
                IfEventHanle.prototype.entry(el, attr)
                break
            default:
                break
        }
    }

    // 解析 :evnet 事件
    doubleDotEventParse() { }
}

// for 事件的处理逻辑
class ForEventHanle {
    constructor() { }

    entry(el, attr) {
        const rightData = this.parseStr(attr.value)
        const leftData = this.parseItem(rightData.item)
        const ary = runStrcmd(rightData.body)
        // 目前值做数组循环
        if (!Array.isArray(ary)) return
    }
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

    render(el, key, ary) {}
}

// if 事件的处理逻辑
class IfEventHanle {
    constructor() { }

    entry(el, attr) {}
    // 渲染真实 dom
    render(el, attr) {}
}