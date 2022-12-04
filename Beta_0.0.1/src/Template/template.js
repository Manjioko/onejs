import { print, IDGenerator, err } from "../utils/func.js"

const prefixStr = {
    forId: 'mf-',
    forStr: 'm-for',
    ifId: 'mi-',
    ifStr: 'm-if',
    textId: 'mt-'
}

export default function template(doc) {
    if (!doc) return
    recursiveEles(doc.body, recurCallback)
    handleTextEle()
}

// 获取元素的全部属性
function getPropertiesByEl(el) {
    if (!el) return []
    return [...el?.attributes ?? []]
}

// 给特殊元素设置id, 返回一个布尔值(Boolean)
function setIdToEl(el) {
    let properties = getPropertiesByEl(el)
    for (const property of properties) {
        if (property.name === prefixStr.forStr) {
            property.ownerElement.setAttribute(prefixStr.forId + IDGenerator(10), '')
            return true
        }
    }
    return false
}

// 递归元素节点，并对每个节点执行一次回调函数
function recursiveEles(orginEle, cb) {
    cb(orginEle)
    const children = orginEle.children
    for (const el of children) {
        if (el.children.length) {
            recursiveEles(el, cb)
        } else {
            cb(el)
        }
    }
}

function recursiveAllNode(orginEle, cb) {
    cb(orginEle)
    const children = orginEle.childNodes
    for (const el of children) {
        if (el.childNodes.length) {
            recursiveAllNode(el, cb)
        } else {
            cb(el)
        }
    }
}

function handleTextEle() {
    // print(window.$propertyid)
    window
    .$propertyid
    .split('/')
    .filter(e => e)
    .forEach(strs => {
        strs
        .split('|')
        .filter(e => e)
        .forEach(str => {
            const el = document.querySelector(`[${str}]`)
            const cb = function(el) {
                if (el.nodeName === '#text') {
                    if (/{{[^{^}]+}}/g.test(el.nodeValue)) {
                        const id = prefixStr.textId + IDGenerator(8)
                        const struct = window.$forStruct[str] 
                        el.parentNode.setAttribute(id, '')
                        if (struct.text) {
                            struct.text[id] = el.nodeValue
                        } else {
                            struct.text = {
                                [id]: el.nodeValue
                            }
                        }
                    }
                }
            }
            recursiveAllNode(el, cb)
        })
    });
}

// 收集同一个节点内部包括其子节点的全部属性 id
function collectPropertyId(el, parentEl) {
    if (!window.$propertyid) {
        window.$propertyid = new String('')
    }

    if (!el) {
        // throw Error('元素 el 出错了：el : ' + el)
        err(el, '元素错误')
    }
    // 传入父级元素时，默认在 $propertyid 上已经记录
    // 父级元素的 id 信息
    const insertPropertyId = getPropertiesByEl(el).find(cp => cp.name.includes(prefixStr.forId))
    const findPropertyId = getPropertiesByEl(parentEl).find(p => p.name.includes(prefixStr.forId))
    if (findPropertyId) {
        insertIdToPropertyid(findPropertyId.name, insertPropertyId.name)
    } else {
        mergePropertyId(insertPropertyId.name)
    }
}

// 通过 findStr 在 window.$propertyid 中查找位置，再在特定位置插入 insertStr
function insertIdToPropertyid(findStr, insertStr) {
    const reg = new RegExp(`(?<=${findStr}\.*?)\/\.*`, 'g')
    window.$propertyid = window.$propertyid.replace(reg, m => `|${insertStr}${m}`)
}

function mergePropertyId(mergeStr) {
    if (!window.$propertyid?.toString()) {
        window.$propertyid += '/' + mergeStr + '/'
    } else {
        window.$propertyid += mergeStr + '/'
    }
}

// 查看一个元素是否存在 for id, 返回一个布尔值
function eleHasForId(el) {
    return getPropertiesByEl(el).some(p => p.name.includes(prefixStr.forId))
}

// 判断 parent 是否是 child 的父元素
function isParent(target, parent) {
    // 回溯的最顶层是 document body
    if (target === window.document.body) {
        return false
    }
    if (target === parent) {
        return true
    }
    return isParent(target.parentNode, parent)
}

// 组合递归的回调函数
function recurCallback(el) {
    // 确保栈存在
    if (!window.$hasIdEles) {
        window.$hasIdEles = []
    }
    // 首先设置 id
    const eleWhoHasSetId = setIdToEl(el)

    if (!eleWhoHasSetId) return

    const foundParent = window.$hasIdEles.find(pEle => isParent(el.parentNode, pEle))

    if (foundParent) {
        collectPropertyId(el, foundParent)
    } else {
        collectPropertyId(el)
    }

    window.$hasIdEles.push(el)
    parseForStructure(el)
}


function parseForStructure(el) {
    if(!window.$forStruct) {
        window.$forStruct = {}
    }
    const id = getPropertiesByEl(el).find(at => at.name.includes(prefixStr.forId))
    const attr = getPropertiesByEl(el).find(at => at.name.includes(prefixStr.forStr))
    // id 和 属性缺一不可，如果不能满足这些条件
    // 说明这个 el 不能没有 for 结构的存在
    if (!id?.name || !attr?.value) return

    const splitStr = attr.value.split(' in ')
    if (splitStr.length < 2) err(attr.value)
    const ary = splitStr[1]?.trim()
    const leftStr = splitStr[0]?.trim()

    const hasBrecket = /\(.*\)/g.test(leftStr)
    if (hasBrecket) {
        // 处理空括号的情况， 如 ()
        if(!/\(.*(?=\w+).*?\)/g.test(leftStr)) {
            err(attr.value)
        }
        // 处理不存在 item, 而存在 index 的情况， 如 ( ,index)
        if (/\([\s]*,.*?\)/g.test(leftStr)) {
            err(attr.value)
        }
        // 匹配正确值，并提取出来填入 window.$forStruct
        leftStr.replace(/\(([^,]+),?(.*?)\)/g, (_, v, v1) => {
            window.$forStruct[id.name] = {
                array: ary,
                item: v.trim(),
                index: v1.trim() ?? ''
            }
        })
    } else {
        window.$forStruct[id.name] = {
            array: ary,
            item: leftStr,
            index: ''
        }
    }
}