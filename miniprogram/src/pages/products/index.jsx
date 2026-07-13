import { useState, useEffect, useCallback } from 'react'
import { View, Text, Input, ScrollView } from '@tarojs/components'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import { request } from '../../utils/api'
import { getPlaceholderGrad } from '../../utils/constants'
import './index.scss'

export default function Products() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [activeCategory, setActiveCategory] = useState(null)
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => { loadCategories(); loadProducts(1, null, '') }, [])
  usePullDownRefresh(() => { loadProducts(1, activeCategory, keyword).then(() => Taro.stopPullDownRefresh()) })

  const loadCategories = async () => {
    try { setCategories((await request('/categories')) || []) } catch (e) { console.error(e) }
  }

  const loadProducts = async (pageNum = 1, categoryId = activeCategory, search = keyword) => {
    if (loading) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('page', pageNum)
      params.append('page_size', 10)
      if (categoryId) params.append('category_id', categoryId)
      if (search) params.append('keyword', search)
      const res = await request(`/products?${params.toString()}`)
      const items = res.items || []
      setProducts(pageNum === 1 ? items : prev => [...prev, ...items])
      setPage(pageNum)
      setHasMore(items.length >= 10)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  const handleSearch = useCallback(() => { setPage(1); loadProducts(1, activeCategory, keyword) }, [keyword, activeCategory])
  const handleCat = (id) => { const c = id === activeCategory ? null : id; setActiveCategory(c); setPage(1); loadProducts(1, c, keyword) }
  const goDetail = (id) => Taro.navigateTo({ url: `/pages/products/detail?id=${id}` })

  return (
    <View className='products'>
      <View className='products-hd'>
        <Text className='products-title'>产品目录</Text>
      </View>

      <View className='search-wrap'>
        <View className='search-row'>
          <Text className='search-icon-text'>搜</Text>
          <Input
            className='search-input'
            placeholder='名称或型号'
            placeholderStyle='color:#bbb'
            value={keyword}
            onInput={(e) => setKeyword(e.detail.value)}
            onConfirm={handleSearch}
            confirmType='search'
          />
          {keyword ? <Text className='search-clear' onClick={() => { setKeyword(''); loadProducts(1, activeCategory, '') }}>✕</Text> : null}
        </View>
      </View>

      <ScrollView className='cat-scroll' scrollX showScrollbar={false}>
        <View className='cat-row'>
          {[{ id: null, name: '全部' }, ...categories].map((c) => (
            <View
              key={c.id}
              className={`cat-tag${activeCategory === c.id ? ' cat-tag--on' : ''}`}
              onClick={() => handleCat(c.id)}
            >
              <Text className='cat-tag-text'>{c.name}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View className='prod-grid'>
        {products.map((p, i) => (
          <View key={p.id} className='prod-card' onClick={() => goDetail(p.id)}>
            <View className='prod-img' style={{ background: getPlaceholderGrad(i) }}>
              {p.is_hot && <View className='prod-hot'><Text className='prod-hot-t'>热</Text></View>}
            </View>
            <View className='prod-info'>
              <Text className='prod-name'>{p.name}</Text>
              {p.model ? <Text className='prod-model'>{p.model}</Text> : null}
              <Text className='prod-cat'>{p.category_name}</Text>
            </View>
          </View>
        ))}
      </View>

      {loading && (
        <View className='state-center'>
          <Text className='state-text'>加载中…</Text>
        </View>
      )}
      {!loading && products.length === 0 && (
        <View className='state-center'>
          <Text className='state-text'>暂无产品</Text>
        </View>
      )}
      {!loading && hasMore && products.length > 0 && (
        <View className='load-more' onClick={() => loadProducts(page + 1)}>
          <Text className='load-more-text'>加载更多</Text>
        </View>
      )}
      {!hasMore && products.length > 0 && (
        <View className='no-more'><Text className='no-more-text'>· 已加载全部 ·</Text></View>
      )}
    </View>
  )
}
