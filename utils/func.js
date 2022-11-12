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


// export {
//     runStrcmd,
//     getXdataFromStr,
//     deepProxy,
//     IDGenerator,
//     typeIs,
//     flatObjectFrom2Level
// }