import { useState, useEffect } from 'react'
import { View, Text, Image, Swiper, SwiperItem } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { request } from '../../utils/api'
import { getPlaceholderGrad } from '../../utils/constants'
import './detail.scss'

export default function CaseDetail() {
  const router = useRouter()
  const [caseData, setCaseData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeImg, setActiveImg] = useState(0)

  useEffect(() => {
    const { id } = router.params
    if (id) load(id)
  }, [])

  const load = async (id) => {
    try {
      const res = await request(`/cases/${id}`)
      setCaseData(res)
      Taro.setNavigationBarTitle({ title: res.name || '案例详情' })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <View className='cd-loading'>
        <Text className='cd-loading-text'>加载中…</Text>
      </View>
    )
  }

  if (!caseData) {
    return (
      <View className='cd-loading'>
        <Text className='cd-loading-text'>案例不存在</Text>
      </View>
    )
  }

  const imgs = caseData.images || []
  const descs = caseData.descriptions || []
  const slideCount = imgs.length || 1

  return (
    <View className='case-detail'>
      {/* Gallery */}
      <View className='cd-gallery'>
        <Swiper
          className='cd-swiper'
          circular={slideCount > 1}
          onChange={(e) => setActiveImg(e.detail.current)}
        >
          {imgs.length > 0 ? imgs.map((img, i) => (
            <SwiperItem key={i}>
              {img.url ? (
                <Image className='cd-img' src={img.url} mode='aspectFill' />
              ) : (
                <View className='cd-slide' style={{ background: getPlaceholderGrad(i) }} />
              )}
            </SwiperItem>
          )) : (
            <SwiperItem>
              <View className='cd-slide' style={{ background: getPlaceholderGrad(0) }} />
            </SwiperItem>
          )}
        </Swiper>
        {slideCount > 1 && (
          <View className='cd-counter'>
            <Text className='cd-counter-t'>{activeImg + 1}/{slideCount}</Text>
          </View>
        )}
      </View>

      {/* Body */}
      <View className='cd-body'>
        <Text className='cd-title'>{caseData.name}</Text>

        {descs.length > 0 && (
          <View className='cd-descs'>
            <View className='cd-sep' />
            <Text className='cd-section-label'>项目介绍</Text>
            {descs.map((d, i) => (
              <Text key={i} className='cd-desc'>{d.content}</Text>
            ))}
          </View>
        )}

        <View className='cd-footer'>
          <Text className='cd-footer-text'>ARROW · 箭牌卫浴</Text>
        </View>
      </View>
    </View>
  )
}
