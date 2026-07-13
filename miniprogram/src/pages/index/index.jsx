import { useState, useEffect } from 'react'
import { View, Text, Swiper, SwiperItem } from '@tarojs/components'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import { request } from '../../utils/api'
import { getPlaceholderGrad, QUICK_NAV } from '../../utils/constants'
import './index.scss'

const FALLBACK_BANNERS = [
  { id: 0, tag: 'NEW ARRIVAL', title: '智能卫浴', subtitle: '重新定义浴室生活' },
  { id: 1, tag: 'FEATURED', title: '匠心系列', subtitle: '每一处细节都值得' },
]

export default function Index() {
  const [banners, setBanners] = useState([])
  const [hotProducts, setHotProducts] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [activeSlide, setActiveSlide] = useState(0)

  useEffect(() => { loadData() }, [])
  usePullDownRefresh(() => { loadData().then(() => Taro.stopPullDownRefresh()) })

  const loadData = async () => {
    try {
      const [b, h, a] = await Promise.all([
        request('/banners'),
        request('/products/hot'),
        request('/announcements'),
      ])
      setBanners(b || [])
      setHotProducts(h || [])
      setAnnouncements(a || [])
    } catch (e) { console.error(e) }
  }

  const goToProduct = (id) => Taro.navigateTo({ url: `/pages/products/detail?id=${id}` })
  const goToProducts = () => Taro.switchTab({ url: '/pages/products/index' })

  const slides = banners.length > 0 ? banners : FALLBACK_BANNERS

  return (
    <View className='home'>

      {/* ── NAV BAR ── */}
      <View className='navbar'>
        <Text className='navbar-brand'>ARROW</Text>
        <Text className='navbar-sub'>箭牌卫浴</Text>
      </View>

      {/* ── HERO ── */}
      <View className='hero'>
        <Swiper
          className='hero-swiper'
          autoplay circular interval={5000}
          onChange={(e) => setActiveSlide(e.detail.current)}
        >
          {slides.map((s, i) => (
            <SwiperItem key={s.id ?? i}>
              <View
                className='hero-slide'
                style={{ background: getPlaceholderGrad(i) }}
                onClick={() => s.link_product_id && goToProduct(s.link_product_id)}
              >
                {/* large watermark letter */}
                <Text className='hero-wm'>A</Text>
                <View className='hero-body'>
                  <Text className='hero-tag'>{s.tag || 'ARROW'}</Text>
                  <Text className='hero-title'>{s.title}</Text>
                  <Text className='hero-sub'>{s.subtitle}</Text>
                  <View className='hero-btn' onClick={goToProducts}>
                    <Text className='hero-btn-text'>查看系列</Text>
                  </View>
                </View>
              </View>
            </SwiperItem>
          ))}
        </Swiper>
        <View className='hero-dots'>
          {slides.map((_, i) => (
            <View key={i} className={`hero-dot${activeSlide === i ? ' hero-dot--on' : ''}`} />
          ))}
        </View>
      </View>

      {/* ── ANNOUNCEMENT ── */}
      {announcements.length > 0 && (
        <View className='notice'>
          <View className='notice-pill'><Text className='notice-pill-text'>公告</Text></View>
          <Swiper className='notice-swiper' vertical autoplay circular interval={3500}>
            {announcements.map((a, i) => (
              <SwiperItem key={a.id ?? i}>
                <Text className='notice-text'>{a.content}</Text>
              </SwiperItem>
            ))}
          </Swiper>
        </View>
      )}

      {/* ── QUICK NAV ── */}
      <View className='section'>
        <View className='section-hd'>
          <Text className='section-label'>产品系列</Text>
        </View>
        <View className='qnav'>
          {QUICK_NAV.map((item, i) => (
            <View key={item.abbr} className='qnav-item' onClick={goToProducts}>
              <View className='qnav-icon' style={{ background: getPlaceholderGrad(i) }}>
                <Text className='qnav-abbr'>{item.abbr}</Text>
              </View>
              <Text className='qnav-label'>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── HOT PRODUCTS ── */}
      <View className='section'>
        <View className='section-hd'>
          <Text className='section-label'>热门产品</Text>
          <View className='section-more' onClick={goToProducts}>
            <Text className='section-more-text'>全部</Text>
          </View>
        </View>
        <View className='hot-grid'>
          {(hotProducts.length > 0 ? hotProducts : Array(4).fill(null)).map((p, i) => (
            <View
              key={p?.id ?? i}
              className='hot-card'
              onClick={() => p && goToProduct(p.id)}
            >
              <View className='hot-img' style={{ background: getPlaceholderGrad(i) }}>
                {p?.is_hot && <View className='hot-badge'><Text className='hot-badge-t'>HOT</Text></View>}
              </View>
              <View className='hot-info'>
                <Text className='hot-name'>{p?.name || '箭牌精选'}</Text>
                <Text className='hot-cat'>{p?.category_name || '卫浴系列'}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View className='footer'>
        <Text className='footer-text'>ARROW · 箭牌卫浴</Text>
      </View>
    </View>
  )
}
