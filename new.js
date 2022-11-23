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

// id 生成器
function IDGenerator() {
    return Number(Math
        .random()
        .toString()
        .slice(2))
        .toString(16)
        // .replace(/(\D)/g, (_,v) => Math.random() > 0.5 ? v.toUpperCase() : v)
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

// xdata 数据发生变更时，从这里开始渲染元素
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
            // 数组变化时处理数组
            if (rekey.endsWith(']')) {
                var r = rekey.replace(/^(.+)(\[\w+\])$/g, (m,v,v2) => v2 ? v : '')
            }
            if (r) rekey = r
            let el_Map = data._data[rekey] ?? []
            for (let [ key, value ] of el_Map) {
                ParseEle.prototype.forEachEle(key)
            }
        }
        // 先查看key是否存在于 xdata 中，不存在则证明是一个
        // 多层次的数据结构，应该在 data._flatData 里面寻找
        if (xdata.hasOwnProperty(key)) {
            // console.log('found it!')
            console.log('newkey is : ' + newKey)
            eleHandle(key)
        } else {
            // console.log('found not!')
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

// 解析元素结构的入口，也是整个页面变动的入口
class ParseEle {
    constructor() { }

    forEachEle(el, key, fn) {
        // console.log('------------------------',key)
        // 保证 el 是一个 dom 节点
        if (!el && !el instanceof HTMLElement) return []
        // 分两层，一层是传入的 el, 一层是 el 的子元素
        fn?.(el, key) ?? this.parseAttributes(el)
        // 处理子元素
        this.childEleHanle(el, key, fn)
    }

    childEleHanle(el, key, fn) {
        // console.log('+++++++++',key)
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
        // 数字的话，就先不做任何事
        // if (!window.isNaN(attr.value)) return
        // const value = runStrcmd(attr.value)
        const rightData = this.parseStr(attr.value)
        const ary = runStrcmd(rightData.body)
        const leftData = this.parseItem(rightData.item)
        // console.log(`item is ${leftData.item} and index is: ${leftData.index}`)
        // 目前值做数组循环
        if (!Array.isArray(ary)) return
        const key = data._flatData.get(ary)
        this.dataSave(el, key, leftData, ary.length - 1)
        this.render(el, key, ary, leftData)
    }
    dataSave(el, key, leftData, index) {
        // console.log(el, key)
        const item = data._data[key]
        // for 复刻出来的元素，不应该保存数据，只保存母本
        // 不然后续数据会膨胀并且难以清理干净
        // console.log(el.attributes, el)
        if (el?.getAttribute('copy')) return
        const xEvent = { for: { cb: fn => fn(), id: IDGenerator(), leftData: {...leftData}, index } }
        if (item) {
            // console.log('>>>>>>>>>>>>>>>>>>>>',el)
            // item.clear()
            item.set(el, { xEvent })
        } else {
            // console.log('---------',el, key)
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
    // 节点删除后，需要擦除 data._data 内记录的节点信息
    // removeRecord(key, el) {
    //     // console.log(key,el)
    //     data._data[key].delete(el)
    //     // console.log(key)
    // }

    render(el, key, ary) {
        // 遍历之前应该删掉 :for 属性，因为重复后，for 已经不需要了
        const id = data._data[key].get(el).xEvent.for.id
        let parent = el.parentNode
        let child = [...parent.children]
        // console.log(el)
        child.forEach(child_el => {
            if(child_el.getAttribute('x-for-id') && child_el !== el) {
                // console.log(key, child_el)
                child_el.remove()
            }
            // if (child_el.getAttribute('x-for-id') && child_el === el) {
            //     console.log(key, child_el)
            //     // ParseEle.prototype.forEachEle(child_el, key, function(ele, key) {
            //     //     console.log('>>>>>>>>>>>>>',key, ele)
            //     //     if (data._data[key].has(ele)) {
            //     //         console.log(data._data[key])
            //     //         data._data[key].delete(ele)
            //     //     }
            //     // })
            // }
        })
        // 重新设置 x-for-id 属性
        el.setAttribute('x-for-id',id)
        // 当数组没有数据时，应该隐藏元元素，以达到页面上的合理效果
        // 即有多少个数组元素，就有多少个元素
        if (!ary.length) {
            el.style.display = 'none'
            return
        } else {
            if (el.style.display === 'none') {
                el.style.display = ''
            }
        }
        console.log('>>>>>>>>>>>>>',el, ary)
        for (let i = 1; i < ary.length; i++) {
            const new_el = el.cloneNode(true)
            // console.log(new_el.getAttribute('copy'))
            new_el.removeAttribute('x-for')
            // console.log(new_el)
            parent.insertBefore(new_el, el)
            new_el.setAttribute('copy', true)
            // 复制出的子元素也要重新遍历一遍
            // 因为子元素内部可能有其他的事件还未处理
            // ParseEle.prototype.forEachEle(new_el) 
        }
    }
}

// if 事件的处理逻辑
class IfEventHanle {
    constructor() { }

    entry(el, attr) {
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
        const isShow = getXdataFromStr(attr.value)
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
