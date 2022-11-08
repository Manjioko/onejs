const data = {
    _data: {},
    _subObject: {},
    _flatData: new Map(),
    isProxyed: false
}
// 运行字面量命令
function runStrcmd(str) {
    return new Function(`return ${str}`)()
}
// 从字符串字面量取 xdata 值
function getXdataFromStr(str) {
    return new Function(`return window.xdata.${str}`)()
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

// 将一个数组的多层嵌套模式结构出单层对象的数据模式，返回一个 Map 数据结构
function flatObjectFrom2Level(obj, tmp = {}, name = '') {
    if (typeof obj !== 'object' ) return obj
    const core =  function(name, key) {
        // console.log('tmp[name] ', obj[name] ?? tmp[name])
        const newName = Array.isArray(obj[name] ?? tmp[name]) ? name + '[' + key + ']' : name + '.' + key
        // obj[newName] = obj[name][key]
        // console.log(newName,getStrValue(newName))
        tmp[newName] = getXdataFromStr(newName)
        flatObjectFrom2Level(obj, tmp ,newName)
    }
    if(name) {
        // Object.keys(obj[name]).forEach(nk => {
        //     if (typeof obj[name][nk] === 'object' && obj[name][nk] !== null) {
        //         core(name, nk)
        //     }
        // })

        Object.keys(tmp[name]).forEach(nk => {
            if (typeof tmp[name][nk] === 'object' && tmp[name][nk] !== null) {
                core(name, nk)
            }
        })
    } else {
        Object.keys(obj).forEach(k => {
            if (typeof obj[k] === 'object' && obj[k] !== null) {
                Object.keys(obj[k]).forEach(sk => {
                    if (typeof obj[k][sk] === 'object' && obj[k][sk] !== null) {
                        core(k,sk)
                    }
                })
            }
        })
    }

    const map = new Map()
    Object.keys(tmp).forEach(key => {
        map.set(tmp[key], key)
    })
    Object.keys(obj).forEach(key => {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            map.set(obj[key], key)
        }
    })
    return map
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
        setTimeout(() => {
            ProxyDataTouched.prototype.entry(target, key, value, receices)
        }, 0);
        return Reflect.set(target, key, value, receices)
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

// xdata 数据发生变更时，从这里开始渲染数据
class ProxyDataTouched {
    constructor() { }

    entry(target, key, value, receices) {
        this.findData(target, key, value, receices)
    }
    findData(target, key, value, receices) {
        const xdata = window.xdata
        if (!data?._data) return
        // 追踪到数据变化，更新元素
        const eleHandle = function(rekey) {
            let el_Map = data._data[rekey] ?? []
            for (let [ key, value ] of el_Map) {
                ParseEle.prototype.forEachEle(key)
            }
        }
        // 先查看key是否存在于xdata中，不存在则证明是一个
        // 多层次的数据结构，应该在data._flatData里面寻找
        if (xdata.hasOwnProperty(key)) {
             eleHandle(key)
        } else {
            console.log('found not!')
            let oldKey = data._flatData.get(receices)
            // 区分数组和对象，数组用 [key] 对象用 .
            if (Array.isArray(target)) {
                const newKey = `${oldKey}[${key}]` 
                console.log('ary newkey is : ' + newKey)
                eleHandle(newKey)
            } else {
                const newKey = `${oldKey}.${key}`
                console.log('obj newkey is : ' + newKey)
                eleHandle(newKey)
            }
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
        // console.log(el, attr.value)
        // 数字的话，就先不做任何事
        // if (!window.isNaN(attr.value)) return
        // const value = runStrcmd(attr.value)
        // console.log(value)
        let for_data = this.parseStr(attr.value)
        let ary = runStrcmd(for_data.body)
        // 目前值做数组循环
        if (!Array.isArray(ary)) return
        let key = data._flatData.get(ary)
        this.dataSave(el, key)
        // 存储映射关系
        // this.dataSave(el, attr)
    }
    dataSave(el, key) {
        const item = data._data[key]
        const xEvent = { for: fn => fn() }
        if (item) {
            item.set(el, { xEvent })
        } else {
            data._data[key] = new Map([[el, { xEvent }]])
        }
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
        // console.log(attr.value)
        const isShow = getXdataFromStr(attr.value)
        // console.log('isshow is ', isShow, attr.value)
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
        window.xdata = deepProxy(window.xdata, handle)
        // window.xdata = flatObjectFrom2Level(window.xdata)
        data._flatData = flatObjectFrom2Level(window.xdata)
        // window.xdata = new Proxy(window.xdata, handle)
    }
    // 启动节点遍历,数据双向绑定
    ParseEle.prototype.forEachEle(el)
}

window.onload = function() {
    run()
}
