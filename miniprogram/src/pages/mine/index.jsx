import { useState, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { request } from '../../utils/api'
import './index.scss'

export default function Mine() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadUser() }, [])
  useDidShow(() => {
    const tabbar = Taro.getCurrentInstance().page?.getTabBar?.()
    tabbar?.setData({ selected: 2 })
  })

  const loadUser = async () => {
    try {
      const token = Taro.getStorageSync('token')
      if (!token) { setLoading(false); return }
      setUser(await request('/user/profile'))
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  const handleLogin = () => {
    Taro.showModal({
      title: '登录',
      content: '请使用微信授权登录',
      confirmText: '授权登录',
      success: async (res) => {
        if (!res.confirm) return
        try {
          const loginRes = await Taro.login()
          const auth = await request('/auth/login', 'POST', { code: loginRes.code })
          Taro.setStorageSync('token', auth.token)
          setUser(auth.user)
          Taro.showToast({ title: '登录成功', icon: 'success' })
        } catch (e) {
          console.error(e)
          Taro.showToast({ title: '登录失败，请重试', icon: 'none' })
        }
      }
    })
  }

  const handleLogout = () => {
    Taro.showModal({
      title: '退出登录', content: '确定退出吗？',
      success: (res) => {
        if (!res.confirm) return
        Taro.removeStorageSync('token')
        setUser(null)
      }
    })
  }

  return (
    <View className='mine'>
      <View className='mine-hero'>
        <Text className='mine-hero-no'>正通科技 · 会员中心</Text>
        <Text className='mine-hero-title'>{user ? '您好，欢迎回来' : '发现美好卫浴生活'}</Text>
        <Text className='mine-hero-copy'>{user ? '您的专属产品与服务信息' : '登录后获取更完整的服务体验'}</Text>
        <Text className='mine-hero-mark'>A</Text>
      </View>

      <View className='mine-profile'>
        <View className='mine-avatar'>
          <Text className='mine-avatar-text'>{user ? (user.nickname?.charAt(0)?.toUpperCase() || 'A') : 'A'}</Text>
        </View>
        {user ? (
          <View className='mine-user'>
            <Text className='mine-name'>{user.nickname || '箭牌用户'}</Text>
            <View className='mine-role-tag'><Text className='mine-role-text'>{user.role === 'admin' ? '管理员' : '经销商'}</Text></View>
          </View>
        ) : (
          <View className='mine-user' onClick={handleLogin}>
            <Text className='mine-name mine-name--hint'>登录您的账号</Text>
            <Text className='mine-hint-sub'>微信授权登录 →</Text>
          </View>
        )}
      </View>

      {user && (
        <View className='mine-section'>
          <Text className='mine-section-label'>账户资料</Text>
          <View className='mine-card'>
            {[
              { k: '账号', v: user.username || '—' },
              { k: '联系电话', v: user.phone || '未填写' },
              { k: '身份', v: user.role === 'admin' ? '管理员' : '经销商' },
            ].map((row, i, arr) => (
              <View key={row.k} className={`mine-row${i === arr.length - 1 ? ' mine-row--last' : ''}`}>
                <Text className='mine-row-k'>{row.k}</Text>
                <Text className='mine-row-v'>{row.v}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View className='mine-actions'>
        {user ? (
          <View className='mine-btn mine-btn--out' onClick={handleLogout}>
            <Text className='mine-btn-text mine-btn-text--out'>退出登录</Text><Text className='mine-btn-arrow'>→</Text>
          </View>
        ) : (
          <View className='mine-btn mine-btn--in' onClick={handleLogin}>
            <Text className='mine-btn-text mine-btn-text--in'>立即登录</Text><Text className='mine-btn-arrow'>→</Text>
          </View>
        )}
      </View>

      <View className='mine-footer'>
        <Text className='mine-footer-brand'>正通科技</Text>
        <Text className='mine-footer-sub'>美好卫浴生活</Text>
      </View>
    </View>
  )
}
