import { useState, useEffect } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import { request } from '../../utils/api'
import { getPlaceholderGrad } from '../../utils/constants'
import './index.scss'

export default function CasesPage() {
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])
  usePullDownRefresh(() => { load().then(() => Taro.stopPullDownRefresh()) })

  const load = async () => {
    try {
      const res = await request('/cases?active_only=true')
      setCases(res || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const goDetail = (id) => Taro.navigateTo({ url: `/pages/cases/detail?id=${id}` })

  return (
    <View className='cases'>
      <View className='cases-hd'>
        <Text className='cases-title'>工程案例</Text>
        <Text className='cases-sub'>精选施工案例展示</Text>
      </View>

      {loading ? (
        <View className='cases-state'>
          <Text className='cases-state-text'>加载中…</Text>
        </View>
      ) : cases.length === 0 ? (
        <View className='cases-state'>
          <Text className='cases-state-text'>暂无案例</Text>
        </View>
      ) : (
        <View className='cases-grid'>
          {cases.map((c, i) => {
            const cover = c.images && c.images[0] && c.images[0].url
            return (
              <View key={c.id} className='case-card' onClick={() => goDetail(c.id)}>
                <View className='case-img' style={cover ? {} : { background: getPlaceholderGrad(i) }}>
                  {cover && <Image className='case-cover' src={cover} mode='aspectFill' />}
                  <View className='case-overlay'>
                    <Text className='case-count'>{c.images.length} 张</Text>
                  </View>
                </View>
                <View className='case-info'>
                  <Text className='case-name'>{c.name}</Text>
                  {c.descriptions.length > 0 && (
                    <Text className='case-desc-preview' numberOfLines={2}>
                      {c.descriptions[0].content}
                    </Text>
                  )}
                </View>
              </View>
            )
          })}
        </View>
      )}

      <View className='cases-footer'>
        <Text className='cases-footer-text'>ARROW · 箭牌卫浴</Text>
      </View>
    </View>
  )
}
