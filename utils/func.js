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

// 将一个数组的多层嵌套模式结构出单层对象的数据模式，返回一个 Map 数据结构
function flatObjectFrom2Level(obj, tmp = {}, name = '') {
    if (typeof obj !== 'object' ) return obj
    
    const core =  function(name, key) {
        const newName = Array.isArray(obj[name] ?? tmp[name]) ? name + '[' + key + ']' : name + '.' + key
        tmp[newName] = getXdataFromStr(newName)
        flatObjectFrom2Level(obj, tmp ,newName)
    }
    if(name) {
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


function deepProxy(target, handle) {
    const truthType = typeIs(target)
    // 只做数组和对象的代理
    if (truthType !== 'Object' && truthType !== 'Array') return target

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


// id 生成器
function IDGenerator() {
    return Number(Math
        .random()
        .toString()
        .slice(2,11))
        .toString(16)
        // .replace(/(\D)/g, (_,v) => Math.random() > 0.5 ? v.toUpperCase() : v)
}

// 解析字符串需要的方法
function parseStr(str) {
    if (str.includes('in')) {
        let str_ary = str.split('in')
        let item = str_ary[0].trim()
        let body = str_ary[1].trim()
        return { item, body }
    }

    return { item: '', body: '' }
}
function parseItem(item) {
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

// 解决 html 内 {{any}} 的值引用问题
function injectHTML(args) {
    let { innerHTML, new_el,idx, leftData, dataName } = args
    let r = new RegExp(`(?=${leftData.item})|(?=${leftData.item}\\.)|(${leftData.item}\\[.+?\\]).*`)
    let hasItem = r.test(innerHTML)
    if (hasItem) {
        let res = innerHTML.replace(/({{(.+?)}})/sg, (m, v, v2) => {
            let reg = new RegExp(`${ leftData.item }`,'g')
            let translateV2 = v2.replace(reg, `${dataName.trim()}[${idx}]`)
            if (translateV2 !== v2) {
                return runStrcmd(translateV2)
            }
            return v2
        })
        new_el.innerHTML = res
    }
}

function forDataChanged(args) {
    let { els, newAry, id, leftData } = args
    let old_el = els?.[0] || ''
    if (!old_el) return
    let parent = old_el.parentNode
    // 把旧元素清理掉
    let old_els = parent.querySelectorAll(`[${id}]`)
    for (let el_item of old_els) {
        if (el_item !== old_el) {
            el_item.remove()
        }
    }
    // 插入新节点
    newAry.forEach(i => {
        let new_el = old_el.cloneNode(true)
        new_el.itemObject = {...leftData}
        parent.insertBefore(new_el, old_el)
    })
    old_el.remove()
}
function forDataInit(args) {
    let { els, ary, leftData, dataName } = args
    for (let el of els) {
        const parent = el.parentNode
        ary.forEach((it, idx) => {
            const new_el = el.cloneNode(true)
            // console.log(new_el, )
            // {{any}} 注入需要的引用值
            injectHTML({
                innerHTML : new_el.innerHTML,
                new_el,
                idx,
                leftData,
                dataName
            })
            new_el.itemObject = {...leftData}
            new_el.saveInnerHTML = el.innerHTML
            // console.log(new_el, new_el.)
            parent.insertBefore(new_el, el)
        })
        el.remove()
    }
}

function forFn(el, attr) {
    // 设置节点ID
    const id = 'x-' + IDGenerator()
    el.setAttribute(id, '')
    // 取出 for 结构体
    const forStr = el.getAttribute('x-for')
    el.removeAttribute('x-for')
    // 解析 for 字符串
    // x-for 的字符串
    const strCMD = parseStr(attr.value)
    // x-for 的遍历值部分
    const leftData = parseItem(strCMD.item)
    // x-for 数组部分
    const ary = runStrcmd(strCMD.body)

    let dataName = $flat.get(ary)
    if (!dataName.startsWith('xdata.')) dataName = 'xdata.' + dataName

    const cb = function (newAry) {
        const els = document.querySelectorAll(`[${id}]`)
        // newAry 存在证明是数据变动引起的
        if (newAry) {
            forDataChanged({
                els, newAry, id, leftData
            })
        } else {
            forDataInit({
                els, ary, leftData, dataName
            })
        }
    }
    
    $bus.on(dataName, cb)
    $stack.unshift(cb)
}
function ifFn(el) {
    // console.log(el)
    // 设置节点ID
    const id = 'x-' + IDGenerator()
    el.setAttribute(id, '')
    const ifStr = el.getAttribute('x-if').trim()
    el.removeAttribute('x-if')

    // 从字符串中取真实值
    const isShow = runStrcmd(ifStr)
    // console.log(isShow)
    let dataName
    if (ifStr.endsWith(']')) {
        dataName = ifStr.replace(/^(.+)(\[\w+\])$/g, (m, v, v2) => v2 ? v : '')
    } else {
        dataName = ifStr
    }
    const cb = function (newData) {
        const isShow = runStrcmd(ifStr)
        const els = document.querySelectorAll(`[${id}]`)
        for (el of els) {
            if (isShow) {
                el.style.display = 'block'
            } else {
                el.style.display = 'none'
            }
        }
    }
    if (!dataName.startsWith('xdata.')) dataName = 'xdata.' + dataName
    $bus.on(dataName.trim(), cb)
    $stack.unshift(cb)
}