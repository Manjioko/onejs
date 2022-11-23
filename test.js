function flatObjectFrom2Level(obj, tmp = {}, name = '') {
    if (typeof obj !== 'object' ) return obj
    const core =  function(name, key) {
        const newName = Array.isArray(obj[name]) ? name + '[' + key + ']' : name + '.' + key
        // obj[newName] = obj[name][key]
        tmp[newName] = obj[name][key]
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
    return map
}


let obj = {
    a: 'av',
    b: [1,2,3, [4,5], {c: 'cv'}],
    d: { d: 'dv', e: {f: 'fv'} }
}
// let m = flatObjectFrom2Level(obj)
// m.forEach()
console.log(flatObjectFrom2Level(obj))
console.log(obj)