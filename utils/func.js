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
    if (typeof obj !== 'object') return obj

    const core = function (name, key) {
        const newName = Array.isArray(obj[name] ?? tmp[name]) ? name + '[' + key + ']' : name + '.' + key
        tmp[newName] = getXdataFromStr(newName)
        flatObjectFrom2Level(obj, tmp, newName)
    }
    if (name) {
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
                        core(k, sk)
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
        .slice(2, 11))
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

function initNodeText(args) {
    let { new_el, idx, leftData, dataName, id, originInnerHTML } = args
    let r = new RegExp(`(?=${leftData.item})|(?=${leftData.item}\\.)|(${leftData.item}\\[.+?\\]).*`)
    let hasItem = r.test(new_el.innerHTML)
    if (hasItem) {
        for (let e of new_el?.childNodes ?? []) {
            if (e.nodeName === '#text') {
                // 将 {{ }} 内数据提取出来，再做替换
                let res = e.textContent.replace(/({{([^\{^\}]+)}})/g, (m, v, v2) => {
                    // 如果存在和 for 语句左侧 item 一致的名称，就替换，不一致则保持不变
                    // console.log('v2: ', v2, 'm: ', m, 'v1', v)
                    let reg = new RegExp(`${leftData.item}`, 'g')
                    let translateV2 = v2.replace(reg, `${dataName.trim()}[${idx}]`)
                    if (translateV2 !== v2) {
                        // 字面量计算结果
                        const result = runStrcmd(translateV2)
                        let suffix = v2.split('.')
                        suffix.shift()
                        suffix = suffix.join('.')
                        // text 改变后应该拍个快照保存
                        // console.log('需要的快照：', runStrcmd(translateV2),)
                        // snapshoot(originInnerHTML, e.textContent, e)
                        console.log('--------------shoot-------------', result)
                        snapshoot(originInnerHTML, { str: result, suffix }, e)
                        // 运行字面量命令，并返回
                        return result
                    }
                    return v
                })
                e.textContent = res
            }

            if (e.nodeName !== '#text') {
                let new_el = e
                initNodeText({ new_el, idx, leftData, dataName, id, originInnerHTML })
            }
        }
    }
}

function dataChangedUpdeteNodeText(args) {
    let { new_el, idx, leftData, dataName, id, originInnerHTML } = args
    // console.log('传进来的元素', new_el)
    // let r = new RegExp(`(?=${leftData.item})|(?=${leftData.item}\\.)|(${leftData.item}\\[.+?\\]).*`)
    for (let getTextEle of new_el?.childNodes ?? []) {
        if (getTextEle.nodeName === '#text') {
            const textParentEleID = getIDFromEle(getTextEle.parentNode)
            const snap = originInnerHTML[textParentEleID]
            if (snap?.str) {
                // let r = new RegExp(`(?=${leftData.item})|(?=${leftData.item}\\.)|(${leftData.item}\\[.+?\\]).*`)
                let r = new RegExp(`${snap.str}.*`)
                // 存在 for 语句 item 的情况
                let hasTouch = r.test(snap.str)
                console.log(new_el, r)
                if (hasTouch) {
                    // console.log('--------------- content -----------', getTextEle, r)
                    // let res = snap.replace(/({{([^\{^\}]+)}})/g, (m, v, v2) => {
                    //     // 如果存在和 for 语句左侧 item 一致的名称，就替换，不一致则保持不变
                    //     let reg = new RegExp(`${leftData.item}`, 'g')
                    //     // console.log(snap,getTextEle.textContent)
                    //     let translateV2 = v2.replace(reg, `${dataName.trim()}[${idx}]`)
                    //     if (translateV2 !== v2) {
                    //         // 运行字面量命令，并返回
                    //         return runStrcmd(translateV2)
                    //     }
                    //     // console.log(v)
                    //     return v
                    // })
                    // // console.log(res)
                    // getTextEle.textContent = res
                    let reg_top = new RegExp(`${snap.str}`, 'g')
                    let res = getTextEle.textContent.replace(reg_top, (m, v) => {
                        if (snap.suffix) {
                            return runStrcmd(`${dataName.trim()}[${idx}].${snap.suffix}`)
                        }
                        return runStrcmd(`${dataName.trim()}[${idx}]`)
                    })
                    if (res) {
                        getTextEle.textContent = res
                    }
                }
            }
        }

        if (getTextEle.nodeName !== '#text') {
            let new_el = getTextEle
            dataChangedUpdeteNodeText({ new_el, idx, leftData, dataName, id, originInnerHTML })
        }
    }
}

function getIDFromEle(ele) {
    const attr =  [...ele.attributes].find(attr => attr.name.includes('ft-'))
    return attr?.name ?? ''
}

function snapshoot(saveObject, snapShootData, element) {
    // 保存地址一定是一个 Object 指针，不然毫无意义
    if (typeIs(saveObject) !== 'Object') return
    // 快照机只保存文本节点
    if (element.nodeName !== '#text') return
    if (!window?.$snap) window.$snap = {}
    // 通过 id 去保存 text 节点快照 
    let attributes = [...element.parentNode.attributes]
    let hasID = attributes.some(at => at.name.includes('ft-'))
    if (!hasID) {
        // 有些节点可能不存在 id，先给他一个 id， 后拍照保存
        let new_id = 'ft-' + IDGenerator()
        element.parentNode.setAttribute(new_id, '')
        saveObject[new_id] = snapShootData
        window.$snap[new_id] = snapShootData
    } else {
        let at = attributes.find(at => at.name.includes('ft-'))
        if (!saveObject[at.name]) {
            // 拍照保存
            saveObject[at.name] = snapShootData
            window.$snap[at.name] = snapShootData
        }
        
    }
    console.log('快照',saveObject)
}

function deleteSnapShoot(orginObj, orginEl) {
    for (let el of orginEl?.childNodes ?? []) {
        if (el.nodeName === '#text') {
            const id = getIDFromEle(el.parentNode)
            delete orginObj[id]
        } else {
            deleteSnapShoot(orginObj, el)
        }
    }
}

function forDataChanged(args) {
    let { els, newAry, id, leftData, originInnerHTML, dataName } = args
    // 全部具有相同id的元素都需要进行更新
    let parent_ary = [...els].map(e => e.parentNode)
    let diff_parent = [...new Set(parent_ary)]
    // 更新数据
    // diff_parent 是含有相同 id 元素可能被复制多份，存在于不同的父级元素中
    // diff_parent 是将这些不同的父级元素汇集起来，后续更新相同 id 元素时，
    // 每一个不同父级元素的内这些相同 id 的子元素，都需要做数据的更新
    diff_parent.forEach(pa => {
        let all_child = pa.querySelectorAll(`[${id}]`)
        let old_el = all_child?.[all_child.length - 1] || ''
        
        if (!old_el) return
        // 把旧元素清理掉
        for (let el_item of all_child) {
            if (el_item !== old_el) {
                el_item.remove()
                // 元素删除，需要删除掉保存在快照中的数据
                // console.log(el_item)
                // deleteSnapShoot(originInnerHTML, el_item)
            }
        }
        console.log('-------------orgin------------',originInnerHTML)
        // 插入新节点
        newAry.forEach((it, idx) => {
            let new_el = old_el.cloneNode(true)
            // 更新节点中text节点的值( {{}} 双大括号内的值需要变动)
            // console.log('新元素 ', new_el)
            dataChangedUpdeteNodeText({ new_el, idx, leftData, dataName, id, originInnerHTML })
            new_el.itemObject = { ...leftData }
            pa.insertBefore(new_el, old_el)
        })
        // console.log('最后的元素 ', old_el)
        old_el.remove()
        // deleteSnapShoot(originInnerHTML, old_el)
        // console.log('--------originInnerHTML ---------', originInnerHTML)
    })
}
function forDataInit(args) {
    let { els, ary, leftData, dataName, originInnerHTML, id } = args
    for (let el of els) {
        const parent = el.parentNode
        ary.forEach((it, idx) => {
            const new_el = el.cloneNode(true)
            // 应该在此处保存初始化数据
            initNodeText({ new_el, idx, leftData, dataName, id, originInnerHTML })
            new_el.itemObject = { ...leftData }
            new_el.saveInnerHTML = el.innerHTML
            parent.insertBefore(new_el, el)
        })
        el.remove()
        // 元素删除，需要删除掉保存在快照中的数据
        // delete originInnerHTML[getIDFromEle(el)]
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

    // 闭包保存 originInnerHTML, originInnerHTML是后续元素更新的重要依据
    // originInnerHTML 内保存的的形式是 id : innerHTML,我们依赖初始化时
    // 的innerHTML去更新数据
    let originInnerHTML = {}

    let dataName = $flat.get(ary)
    if (!dataName.startsWith('xdata.')) dataName = 'xdata.' + dataName

    const cb = function (newAry) {
        const els = document.querySelectorAll(`[${id}]`)
        // newAry 存在证明是数据变动引起的
        if (newAry) {
            forDataChanged({
                els, newAry, id, leftData, originInnerHTML, dataName,
            })
        } else {
            forDataInit({
                els, ary, leftData, dataName, originInnerHTML, id
            })
        }
    }

    $bus.on(dataName, cb)
    $stack.unshift(cb)
}

function ifFn(el) {
    // 设置节点ID
    const id = 'x-' + IDGenerator()
    el.setAttribute(id, '')
    const ifStr = el.getAttribute('x-if').trim()
    el.removeAttribute('x-if')

    // 从字符串中取真实值
    const isShow = runStrcmd(ifStr)
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