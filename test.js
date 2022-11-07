function flatObjectFrom2Level(obj, name) {
    if (typeof obj !== 'object' ) return obj
    const core =  function(name, key) {
        const newName = Array.isArray(obj[name]) ? name + '[' + key + ']' : name + '.' + key
        obj[newName] = obj[name][key]
        flatObject2(obj, newName)
    }
    if(name) {
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
                        core(k,sk)
                    }
                })
            }
        })
    }

    return obj
}


function getStrValue(str) {
    return new Function(`return globalThis.xdata.${str}`).call(globalThis)
}
xerr = {}
xdata = {a: {b: 'c', d: [1,2,3]}}
console.log(getStrValue('a.d'))