import { useState, useEffect } from 'react'
import { View, Text, Image, Swiper, SwiperItem } from '@tarojs/components'
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'
import { request } from '../../utils/api'
import { getPlaceholderGrad, QUICK_NAV } from '../../utils/constants'
import brandLogo from '../../assets/brand/zhengtongkeji-symbol.png'
import './index.scss'

const FALLBACK_BANNERS = [
  { id: 0, tag: '新品上市', title: '智能卫浴', subtitle: '重新定义浴室生活' },
  { id: 1, tag: '匠心之选', title: '匠心系列', subtitle: '每一处细节都值得' },
]

export default function Index() {
  const [banners, setBanners] = useState([])
  const [hotProducts, setHotProducts] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [activeAnnouncement, setActiveAnnouncement] = useState(0)
  const [company, setCompany] = useState(null)
  const [activeSlide, setActiveSlide] = useState(0)

  useEffect(() => { loadData() }, [])
  usePullDownRefresh(() => { loadData().then(() => Taro.stopPullDownRefresh()) })
  useDidShow(() => {
    const tabbar = Taro.getCurrentInstance().page?.getTabBar?.()
    tabbar?.setData({ selected: 0 })
  })

  const loadData = async () => {
    try {
      const [b, h, a, c] = await Promise.all([
        request('/banners'),
        request('/products/hot'),
        request('/announcements'),
        request('/company'),
      ])
      setBanners(b || [])
      setHotProducts(h || [])
      setAnnouncements(a || [])
      setCompany(c || null)
    } catch (e) { console.error(e) }
  }

  const goToProduct = (id) => Taro.navigateTo({ url: `/pages/products/detail?id=${id}` })
  const goToProducts = () => Taro.switchTab({ url: '/pages/products/index' })
  const goToCompany = () => Taro.navigateTo({ url: '/pages/company/index' })
  const goToCases = () => Taro.navigateTo({ url: '/pages/cases/index' })
  const openAnnouncement = () => {
    const announcement = announcements[activeAnnouncement]
    if (!announcement?.content) return
    Taro.showModal({
      title: '公告详情',
      content: announcement.content,
      showCancel: false,
      confirmText: '知道了',
      confirmColor: '#214EA9',
    })
  }

  const slides = banners.length > 0 ? banners : FALLBACK_BANNERS

  return (
    <View className='home'>
      <View className='home-topbar'>
        <View>
          <Text className='home-brand'>正通科技</Text>
          <Text className='home-brand-sub'>美好卫浴生活</Text>
        </View>
        <View className='home-logo-card'>
          <Image className='home-logo' src={brandLogo} mode='aspectFit' />
        </View>
      </View>

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
                {s.image_url && <Image className='hero-image' src={s.image_url} mode='aspectFill' />}
                <View className='hero-shade' />
                <Text className='hero-edition'>0{i + 1}</Text>
                <View className='hero-body'>
                  <Text className='hero-tag'>{s.tag || '正通科技 · 卫浴空间'}</Text>
                  <Text className='hero-title'>{s.title}</Text>
                  <Text className='hero-sub'>{s.subtitle}</Text>
                  <View className='hero-btn' onClick={goToProducts}>
                    <Text className='hero-btn-text'>探索系列</Text>
                    <Text className='hero-btn-arrow'>→</Text>
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

      {announcements.length > 0 && (
        <View className='notice'>
          <View className='notice-stem' />
          <Text className='notice-label'>公告</Text>
          <Swiper
            className='notice-swiper'
            vertical
            autoplay
            circular
            interval={3500}
            onChange={(e) => setActiveAnnouncement(e.detail.current)}
          >
            {announcements.map((a, i) => (
              <SwiperItem key={a.id ?? i}>
                <Text className='notice-text'>{a.content}</Text>
              </SwiperItem>
            ))}
          </Swiper>
          <View className='notice-action' onClick={openAnnouncement}>
            <Text className='notice-action-label'>查看全文</Text>
            <Text className='notice-action-arrow'>→</Text>
          </View>
        </View>
      )}

      <View className='section'>
        <View className='section-hd'>
          <View>
            <Text className='section-eyebrow'>正通科技 · 产品系列</Text>
            <Text className='section-label'>产品系列</Text>
          </View>
          <Text className='section-index'>01</Text>
        </View>
        <View className='qnav'>
          {QUICK_NAV.map((item, i) => (
            <View key={item.abbr} className='qnav-item' onClick={goToProducts}>
              <View className='qnav-icon' style={{ background: getPlaceholderGrad(i) }}>
                <Text className='qnav-abbr'>{item.abbr}</Text>
                <Text className='qnav-arrow'>↗</Text>
              </View>
              <Text className='qnav-label'>{item.label}</Text>
            </View>
          ))}
          <View className='qnav-item' onClick={goToCases}>
              <View className='qnav-icon' style={{ background: getPlaceholderGrad(QUICK_NAV.length) }}>
                <Text className='qnav-abbr'>案</Text>
                <Text className='qnav-arrow'>↗</Text>
            </View>
            <Text className='qnav-label'>工程案例</Text>
          </View>
        </View>
      </View>

      {company && (company.company_name || company.slogan) && (
        <View className='section section--company'>
          <View className='company-card' onClick={goToCompany}>
            <Text className='company-card-no'>02 / 关于正通科技</Text>
            <View className='company-card-inner'>
              <Text className='company-card-name'>{company.company_name || '正通科技'}</Text>
              {company.slogan ? <Text className='company-card-slogan'>{company.slogan}</Text> : null}
              <View className='company-card-cta'><Text>了解品牌故事</Text><Text>→</Text></View>
            </View>
            <Text className='company-card-wm'>A</Text>
          </View>
        </View>
      )}

      <View className='section'>
        <View className='section-hd'>
          <View>
            <Text className='section-eyebrow'>正通科技 · 精选产品</Text>
            <Text className='section-label'>热门产品</Text>
          </View>
          <View className='section-more' onClick={goToProducts}>
            <Text className='section-more-text'>查看全部 →</Text>
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
                {p?.images?.[0]?.url && <Image className='hot-cover' src={p.images[0].url} mode='aspectFill' />}
                <Text className='hot-number'>0{i + 1}</Text>
                {p?.is_hot && <View className='hot-badge'><Text className='hot-badge-t'>精选</Text></View>}
              </View>
              <View className='hot-info'>
                <Text className='hot-name'>{p?.model || p?.name || '正通精选'}</Text>
                <Text className='hot-cat'>{p?.category_name || '卫浴系列'} <Text className='hot-link'>↗</Text></Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View className='footer'>
        <Text className='footer-text'>正通科技</Text>
      </View>
    </View>
  )
}
