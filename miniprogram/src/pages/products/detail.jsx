import { useState, useEffect } from 'react'
import { View, Text, Swiper, SwiperItem } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { request } from '../../utils/api'
import { getPlaceholderGrad } from '../../utils/constants'
import './detail.scss'

export default function ProductDetail() {
  const router = useRouter()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeImg, setActiveImg] = useState(0)

  useEffect(() => { const { id } = router.params; if (id) load(id) }, [])

  const load = async (id) => {
    try {
      const res = await request(`/products/${id}`)
      setProduct(res)
      Taro.setNavigationBarTitle({ title: res.name || '产品详情' })
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  if (loading) return (
    <View className='detail-loading'><Text className='detail-loading-text'>加载中…</Text></View>
  )
  if (!product) return (
    <View className='detail-loading'><Text className='detail-loading-text'>产品不存在</Text></View>
  )

  const attrs = product.attributes || []
  const imgs = product.images || []
  const slideCount = imgs.length || 1

  return (
    <View className='detail'>
      {/* GALLERY */}
      <View className='gallery'>
        <Swiper
          className='gallery-swiper'
          circular={slideCount > 1}
          onChange={(e) => setActiveImg(e.detail.current)}
        >
          {slideCount > 1 ? imgs.map((_, i) => (
            <SwiperItem key={i}>
              <View className='gallery-slide' style={{ background: getPlaceholderGrad(i) }} />
            </SwiperItem>
          )) : (
            <SwiperItem>
              <View className='gallery-slide' style={{ background: getPlaceholderGrad(product.id || 0) }} />
            </SwiperItem>
          )}
        </Swiper>
        {slideCount > 1 && (
          <View className='gallery-counter'>
            <Text className='gallery-counter-t'>{activeImg + 1}/{slideCount}</Text>
          </View>
        )}
      </View>

      {/* INFO */}
      <View className='detail-body'>
        <View className='detail-tags'>
          {product.category_name && (
            <View className='dtag'><Text className='dtag-text'>{product.category_name}</Text></View>
          )}
          {product.is_hot && (
            <View className='dtag dtag--hot'><Text className='dtag-text'>热销</Text></View>
          )}
        </View>

        <Text className='detail-name'>{product.name}</Text>

        {product.model && (
          <View className='detail-model-row'>
            <Text className='detail-model-label'>型号</Text>
            <Text className='detail-model-val'>{product.model}</Text>
          </View>
        )}

        {product.description && (
          <View className='detail-desc-block'>
            <View className='detail-sep' />
            <Text className='detail-desc-label'>产品介绍</Text>
            <Text className='detail-desc'>{product.description}</Text>
          </View>
        )}

        {attrs.length > 0 && (
          <View className='attrs'>
            <View className='detail-sep' />
            <Text className='attrs-label'>产品参数</Text>
            {attrs.map((a, i) => (
              <View key={i} className={`attr-row${i % 2 === 1 ? ' attr-row--alt' : ''}`}>
                <Text className='attr-k'>{a.key}</Text>
                <Text className='attr-v'>{a.value}</Text>
              </View>
            ))}
          </View>
        )}

        <View className='detail-footer'>
          <Text className='detail-footer-text'>ARROW · 箭牌卫浴</Text>
        </View>
      </View>
    </View>
  )
}
