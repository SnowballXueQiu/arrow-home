import { useState, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { request } from '../../utils/api'
import './index.scss'

export default function Mine() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadUser() }, [])

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
          const { code } = await Taro.login()
          const auth = await request('/auth/login', 'POST', { code })
          Taro.setStorageSync('token', auth.token)
          setUser(auth.user)
        } catch (e) { console.error(e) }
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
      {/* HEADER */}
      <View className='mine-header'>
        <View className='mine-avatar'>
          <Text className='mine-avatar-text'>
            {user ? (user.nickname?.charAt(0)?.toUpperCase() || 'A') : '?'}
          </Text>
        </View>
        {user ? (
          <View className='mine-user'>
            <Text className='mine-name'>{user.nickname || '箭牌用户'}</Text>
            <View className='mine-role-tag'>
              <Text className='mine-role-text'>{user.role === 'admin' ? '管理员' : '经销商'}</Text>
            </View>
          </View>
        ) : (
          <View className='mine-user' onClick={handleLogin}>
            <Text className='mine-name mine-name--hint'>点击登录</Text>
            <Text className='mine-hint-sub'>查看个人信息与权限</Text>
          </View>
        )}
      </View>

      {/* INFO */}
      {user && (
        <View className='mine-card'>
          <Text className='mine-card-label'>账户信息</Text>
          {[
            { k: '账号', v: user.username || '—' },
            { k: '手机', v: user.phone || '—' },
            { k: '角色', v: user.role === 'admin' ? '管理员' : '经销商' },
          ].map((row, i, arr) => (
            <View key={row.k} className={`mine-row${i === arr.length - 1 ? ' mine-row--last' : ''}`}>
              <Text className='mine-row-k'>{row.k}</Text>
              <Text className='mine-row-v'>{row.v}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ACTIONS */}
      <View className='mine-actions'>
        {user ? (
          <View className='mine-btn mine-btn--out' onClick={handleLogout}>
            <Text className='mine-btn-text mine-btn-text--out'>退出登录</Text>
          </View>
        ) : (
          <View className='mine-btn mine-btn--in' onClick={handleLogin}>
            <Text className='mine-btn-text mine-btn-text--in'>立即登录</Text>
          </View>
        )}
      </View>

      <View className='mine-footer'>
        <Text className='mine-footer-brand'>ARROW</Text>
        <Text className='mine-footer-sub'>箭牌卫浴 · 品质之选</Text>
      </View>
    </View>
  )
}
