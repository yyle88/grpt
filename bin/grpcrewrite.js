#!/usr/bin/env node

import fs from 'fs'

/**
 * Rewrites the specified file by replacing gRPC calls with HTTP calls.
 *
 * @param {string} codePath - The path to the file to be rewritten.
 */
function rewrite(codePath) {
    if (!codePath) {
        console.error('没有路径参数-请设置文件路径.')
        return
    }
    fs.readFile(codePath, 'utf8', (err, data) => {
        if (err) {
            console.error(`读取文件失败: ${err}`)
            return
        }

        // 进行替换，把逻辑里调用grpc的地方都改为调用http，这样就能避免麻烦啦，毕竟配置代理什么的，还是比较麻烦的
        let newContent = data.replace(/stackIntercept</g, 'executeGrtp<').replace(/UnaryCall</g, 'GrtpPromise<')

        // 判断是否已经存在目标引用，当然假如将来这个文件路径会变的话还得修改这里的代码
        const targetImport =
            `import { executeGrtp } from '@yyle88/grpt/src/grpcviahttp';` +
            "\n" +
            `import type { GrtpPromise } from '@yyle88/grpt/src/grpcviahttp';`
        // 把目标代码追加到这句的后面，因此需要在引用里找这句的位置
        const searchImport = 'import type { RpcOptions } from "@protobuf-ts/runtime-rpc";'
        if (!newContent.includes(targetImport)) {
            // 找到指定引用的位置
            const targetIndex = newContent.indexOf(searchImport)
            if (targetIndex !== -1) {
                // 在目标引用的后面添加新的引用
                const insertIndex = targetIndex + searchImport.length
                // 使用数组截取的方法拼接出结果
                newContent = newContent.slice(0, insertIndex) + `\n${targetImport}` + newContent.slice(insertIndex)
            }
        }

        fs.writeFile(codePath, newContent, 'utf8', (err) => {
            if (err) {
                console.error(`写入文件失败: ${err}`)
                return
            }
            console.debug('内容替换成功!')
        })
    })
}

// English Comments-英文注释:
// -----------------
// Execute the replacement logic
// For example:
// Running the command outside the project: npm run grpcrewrite -- /xxx/src/rpc/rpc_admin_login/admin_login.client.ts
// will automatically modify the content of the specified file.
// It will replace the gRPC request logic with HTTP request logic, ultimately using HTTP endpoints while keeping the gRPC parameters and return types.
// Chinese Comments-中文注释:
// ---------
// 执行替换的逻辑
// 比如
// 在项目外侧执行: npm run grpcrewrite -- /xxx/src/rpc/rpc_admin_login/admin_login.client.ts
// 就会自动修改这个文件的内容
// 将会把里面的 gRPC 请求逻辑替换为 HTTP 请求逻辑，最终使用的是 HTTP 的接口，gRPC 的参数和返回类型
const codePath = process.argv[2]
if (codePath) {
    rewrite(codePath)
} else {
    console.error('没有路径参数-请设置文件路径.')
}
