import Taro from '@tarojs/taro'

const BASE_URL = 'http://localhost:8000'

export const request = async (url, method = 'GET', data = {}) => {
  try {
    const token = Taro.getStorageSync('token')
    const headers = { 'Content-Type': 'application/json' }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const res = await Taro.request({
      url: `${BASE_URL}${url}`,
      method,
      data,
      header: headers
    })

    if (res.statusCode >= 200 && res.statusCode < 300) {
      return res.data
    }

    const msg = res.data?.detail || '请求失败'
    Taro.showToast({ title: msg, icon: 'none' })
    throw new Error(msg)
  } catch (e) {
    if (!e.message?.includes('请求失败')) {
      Taro.showToast({ title: '网络错误', icon: 'none' })
    }
    throw e
  }
}
