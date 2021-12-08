// 如果需要兼容使用请安装 whatwg-fetch
const baseURL = ''

const headers = (init = {}) => {
	return new Headers(init)
}
/**
 * 格式化 request search 参数
 * @param {Object} json - 需要拼接的参数
 * @return {String} String 会排除 Undefined 和 Null 类型的参数
 */
const paramsFormat = json => {
	return new URLSearchParams(json).toString()
}

const interceptors = res => {
	const errCodes = {
		400: '请求参数错误',
		403: '无权访问',
		404: '资源不存在',
		413: '请求文件过大',
		500: '服务器内部错误'
	}
	if (res.status && res.ok) {
		return res.json()
	}
	if (res.status === 403) {
		console.info('无权访问')
	}
	if (errCodes.hasOwnProperty(res.status)) {
		throw errCodes[res.status]
	}
}

/**
 * Fetch请求
 * @param url 请求地址
 * @param method 请求方式: http method 'get' | 'post' | 'delete' | 'put'
 * @param params 请求参数: { query: Object, data: Object, headers: Object, timeout: Number }
 * @returns {Promise} Promise
 */
export const fetchRequest = (
	url = '',
	method = 'get',
	params = { query: {}, data: {}, headers: {}, timeout: 10 }
) => {
	const controller = new AbortController()
	const options = {
		method,
		headers: headers({
			'content-Type': 'application/json'
		}),
		// 属性指定一个 AbortSignal 实例，用于取消fetch()请求
		signal: controller.signal,
		// 携带凭据请求  省略: 'omit', 同源携带: 'same-origin', 强制携带: 'include'
		credentials: 'same-origin'
	}
	if (params.query) {
		const queryString = paramsFormat(params.query)
		url += queryString && `?${queryString}`
	}
	if (method !== 'get' && params.data) {
		options.body = JSON.stringify(params.data)
	}
	if (params.headers) {
		const keys = Object.keys(params.headers)
		keys.forEach(item => {
			options.headers.append(keys, params.headers[item])
		})
	}
	const timeout = params.timeout || 10
	if (timeout > 0) {
		setTimeout(() => controller.abort(), timeout * 1000)
	}
	const reqUrl = `${baseURL}${url}`
	return fetch(reqUrl, options)
		.then(res => {
			return interceptors(res)
		})
		.catch(error => {
			if (error?.message?.includes('The user aborted a request')) {
				console.error('请求超时: ', reqUrl)
			} else {
				console.error('请求错误: ', error)
			}
		})
}

/**
 * Fetch上传文件
 * @param url 请求地址
 * @param data 文件 file: FormData
 * @param params 请求参数: { query: Object, headers: Object }
 * @returns {Promise} Promise
 */
export const fetchFormData = (
	url,
	data,
	params = { query: {}, headers: {} }
) => {
	const options = {
		method: 'post',
		body: data,
		headers: headers({}),
		// 携带凭据请求  省略: 'omit', 同源携带: 'same-origin', 强制携带: 'include'
		credentials: 'same-origin'
	}
	if (params.query) {
		url += `?${paramsFormat(params.query)}`
	}
	if (params.headers) {
		const keys = Object.keys(params.headers)
		keys.forEach(item => {
			options.headers.append(keys, params.headers[item])
		})
	}
	const reqUrl = `${baseURL}${url}`
	return fetch(reqUrl, options)
		.then(res => {
			return interceptors(res)
		})
		.catch(error => {
			console.error('请求错误: ', error)
		})
}

/**
 * Fetch 文件流
 * @param url 请求地址
 * @param params 请求参数: { query: Object, headers: Object }
 * @param fileType 文件的 MIME 类型
 * @returns {Promise} Promise
 */
export const fetchDownloadBlob = (
	url,
	params = { query: {}, headers: {} },
	fileType
) => {
	const options = {
		method: 'get',
		responseType: 'arraybuffer',
		headers: headers({}),
		// 携带凭据请求  省略: 'omit', 同源携带: 'same-origin', 强制携带: 'include'
		credentials: 'same-origin'
	}
	if (params.query) {
		url += `?${paramsFormat(params.query)}`
	}
	if (params.headers) {
		const keys = Object.keys(params.headers)
		keys.forEach(item => {
			options.headers.append(keys, params.headers[item])
		})
	}
	const reqUrl = `${baseURL}${url}`
	return fetch(reqUrl, options)
		.then(res => {
			return {
				fileName:
					decodeURI(res.headers.get('Content-Disposition')) ||
					new Date().getTime(),
				buffer: res.arrayBuffer()
			}
		})
		.then(res => {
			const { fileName, buffer } = res
			buffer.then(bufferRes => {
				if (bufferRes?.byteLength > 0) {
					const bl = new Blob([bufferRes], { type: fileType })
					const link = document.createElement('a')
					link.href = window.URL.createObjectURL(bl)
					link.download = fileName
					link.click()
					window.URL.revokeObjectURL(link.href)
				} else {
					console.error('文件导出错误, 服务器暂无相关文件资源.')
				}
			})
		})
		.catch(error => {})
}
