const data = {
    _data: {},
    _subObject: {},
    isProxyed: false
}
// 从字符串字面量取 xdata 值
function getStrValue(str) {
    return new Function(`return window.xdata.${str}`).call(window)
}
// 类型判断
function typeIs(data) {
    return Object.prototype.toString.call(data).slice(8, -1)
}
// 拍扁一个数组或者对象
function flatObject(obj, name) {
    let res = {}
    Object.keys(obj).forEach(key => {
        const type = typeIs(obj[key])
        if (type === 'Object' || type === 'Array') {
            let prefix
            if (!isNaN(key)) {
                prefix = name ? name + '[' + key + ']' : key
            } else {
                prefix = name ? name + '.' + key : key
            }
            Object.assign(res, flatObject(obj[key], prefix))
        } else {
            if (name) {
                const isAry = Array.isArray(obj)
                if (isAry) {
                    res[name + '[' + key + ']'] = obj[key]
                } else {
                    res[name + '.' + key] = obj[key]
                }
            } else {
                res[key] = obj[key]
            }
        }
    })
    return res
}

// 只允许对象带有一层级的对象或者数组数据，如果超过两层
// 就需要复制到一级对象中
function flatObjectFrom2Level(obj, name) {
    if (typeof obj !== 'object') return obj
    const core = function (name, key) {
        const newName = Array.isArray(obj[name]) ? name + '[' + key + ']' : name + '.' + key
        obj[newName] = obj[name][key]
        flatObjectFrom2Level(obj, newName)
    }
    if (name) {
        Object.keys(obj[name]).forEach(nk => {
            if (typeof obj[name][nk] === 'object' && obj[name][nk] !== null) {
                core(name, nk)
            }
        })
    } else {
        Object.keys(obj).forEach(k => {
            if (typeof obj[k] === 'object' && obj[k] !== null) {
                Object.keys(obj[k]).forEach(sk => {
                    if (typeof obj[k][sk] === 'object' && obj[k][sk] !== null) {
                        core(k, sk)
                    }
                })
            }
        })
    }

    return obj
}

// 代理 handle
const handle = Object.freeze({
    get: function (target, key) {
        // if (typeof target[key] === 'object' && target[key] !== null) {
        //     return new Proxy(target[key], handle)
        // }
        return Reflect.get(target, key)
    },
    set: function (target, key, value) {
        console.log(`${key} 被赋值为 ${value}`)
        ProxyDataTouched.prototype.entry(target, key, value)
        return Reflect.set(target, key, value)
    }
})


// 数据代理
function deepProxy(target, handle) {
    const truthType = typeIs(target)
    // 只做数组和对象的代理
    if (truthType !== 'Object' && truthType !== 'Array') return target

    // 锁代理
    if (!data.isProxyed) data.isProxyed = true

    if (truthType === 'Object') {
        for (let [key, value] of Object.entries(target)) {
            const type = typeIs(value)
            if (type === 'Object' || type === 'Array') {
                target[key] = deepProxy(target[key], handle)
            }
        }
        return new Proxy(target, handle)
    } else {
        target.forEach((item, idx) => {
            const type = typeIs(item)
            if (type === 'Object' || type === 'Array') {
                target[idx] = deepProxy(item, handle)
            }
        })
        return new Proxy(target, handle)
    }
}

class ProxyDataTouched {
    constructor() { }

    entry(target, key, value) {
        this.findData(target,key)
    }
    findData(target, key) {
        const xdata = window.xdata
        if (xdata.hasOwnProperty(key)) {
            console.log('found it!')
            
            let el_Map = data._data[key]
            console.log(key)
            console.log(data._data)
            for (let [ key, value ] of el_Map) {
                ParseEle.prototype.forEachEle(key)
            } 
        } else {
            console.log('found not!')
        }
    }
    findEvent(g) { }
}

class ParseEle {
    constructor() { }

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

class ParseDiffEvent {
    constructor() { }

    // 解析 x-evnet 事件
    xEventParse(el, attr) {
        const name = attr.name.slice(2)
        switch (name) {
            case 'for':
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

class ForEventHanle {
    constructor() { }

    entry(el, attr) {
        // console.log(el, attr)
        // 存储映射关系
        // this.dataSave(el, attr)
    }
    dataSave(el, attr) { }
    render() { }
}

class IfEventHanle {
    constructor() { }

    entry(el, attr) {
        // console.log(el, attr)
        // 存储映射关系
        this.dataSave(el, attr)
        // 渲染真实 dom
        this.render(el, attr)
    }
    // 存储映射关系
    dataSave(el, attr) {
        const item = data._data[attr.value]
        const xEvent = { if: fn => fn() }
        if (item) {
            item.set(el, { xEvent })
        } else {
            data._data[attr.value] = new Map([[el, { xEvent }]])
        }
    }
    // 渲染真实 dom
    render(el, attr) {
        const isShow = getStrValue(attr.value)
        if (!!isShow) {
            el.style.display = 'block'
        } else {
            el.style.display = 'none'
        }
    }
}

// 程序入口
function run(el) {
    if (!el) el = document.body
    // 第一进入时应该代理数据
    if (!data.isProxyed) {
        window.xdata = flatObjectFrom2Level(window.xdata)
        window.xdata = deepProxy(window.xdata, handle)
        // window.xdata = new Proxy(window.xdata, handle)
    }
    // 启动节点遍历
    ParseEle.prototype.forEachEle(el)
}

run()
