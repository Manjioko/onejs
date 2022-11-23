const print = console.log
// id 生成器
function IDGenerator(num) {
    return Number(Math
        .random()
        .toString()
        .slice(2, num ?? 10))
        .toString(16)
}
function err(str, errMsg) {
    throw new TypeError(`"${str}" ${errMsg ?? '语法错误'}`)
}
export { print, IDGenerator, err }