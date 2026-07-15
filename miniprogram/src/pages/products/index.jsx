import { useState, useEffect, useCallback } from 'react'
import { View, Text, Image, Input, ScrollView } from '@tarojs/components'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import { request } from '../../utils/api'
import { getPlaceholderGrad } from '../../utils/constants'
import './index.scss'

export default function Products() {
  const [products, setProducts] = useState([])
  const [tree, setTree] = useState([])       // full category tree
  const [l2List, setL2List] = useState([])   // L2 under 经营产品
  const [l3List, setL3List] = useState([])   // L3 under active L2
  const [activeL2, setActiveL2] = useState(null)
  const [activeL3, setActiveL3] = useState(null)
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    loadCategories()
    loadProducts(1, null, '')
  }, [])

  usePullDownRefresh(() => {
    loadProducts(1, activeL3 ?? activeL2, keyword).then(() => Taro.stopPullDownRefresh())
  })

  const loadCategories = async () => {
    try {
      // Tree endpoint returns full nested structure
      const roots = await request('/categories')
      if (!roots || !roots.length) return
      setTree(roots)

      // Find 经营产品 L1 node; fall back to showing roots as L2 if no such node
      const jingying = roots.find(r => r.name === '经营产品')
      const l2 = jingying ? (jingying.children || []) : roots
      setL2List(l2)
    } catch (e) { console.error(e) }
  }

  const loadProducts = async (pageNum = 1, categoryId = null, search = keyword) => {
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

  const handleSearch = useCallback(() => {
    setPage(1)
    loadProducts(1, activeL3 ?? activeL2, keyword)
  }, [keyword, activeL2, activeL3])

  const handleL2 = (id) => {
    const newL2 = id === activeL2 ? null : id
    setActiveL2(newL2)
    setActiveL3(null)
    // Update L3 list
    if (newL2) {
      const node = findNode(tree, newL2)
      setL3List(node ? node.children : [])
    } else {
      setL3List([])
    }
    setPage(1)
    loadProducts(1, newL2, keyword)
  }

  const handleL3 = (id) => {
    const newL3 = id === activeL3 ? null : id
    setActiveL3(newL3)
    setPage(1)
    loadProducts(1, newL3 ?? activeL2, keyword)
  }

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
          {keyword ? <Text className='search-clear' onClick={() => { setKeyword(''); loadProducts(1, activeL3 ?? activeL2, '') }}>✕</Text> : null}
        </View>
      </View>

      {/* L2 category tabs */}
      <ScrollView className='cat-scroll cat-scroll--l2' scrollX showScrollbar={false}>
        <View className='cat-row'>
          <View
            className={`cat-tag${activeL2 === null ? ' cat-tag--on' : ''}`}
            onClick={() => handleL2(null)}
          >
            <Text className='cat-tag-text'>全部</Text>
          </View>
          {l2List.map((c) => (
            <View
              key={c.id}
              className={`cat-tag${activeL2 === c.id ? ' cat-tag--on' : ''}`}
              onClick={() => handleL2(c.id)}
            >
              <Text className='cat-tag-text'>{c.name}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* L3 sub-category tabs — only when L2 is selected and has children */}
      {l3List.length > 0 && (
        <ScrollView className='cat-scroll cat-scroll--l3' scrollX showScrollbar={false}>
          <View className='cat-row'>
            <View
              className={`cat-tag cat-tag--sm${activeL3 === null ? ' cat-tag--on' : ''}`}
              onClick={() => handleL3(null)}
            >
              <Text className='cat-tag-text'>全部</Text>
            </View>
            {l3List.map((c) => (
              <View
                key={c.id}
                className={`cat-tag cat-tag--sm${activeL3 === c.id ? ' cat-tag--on' : ''}`}
                onClick={() => handleL3(c.id)}
              >
                <Text className='cat-tag-text'>{c.name}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      <View className='prod-grid'>
        {products.map((p, i) => {
          const coverUrl = p.images && p.images[0] && p.images[0].url
          const hasPrice = p.show_price && p.price != null
          const hasDiscount = hasPrice && p.discount_price != null
          return (
            <View key={p.id} className='prod-card' onClick={() => goDetail(p.id)}>
              <View className='prod-img' style={coverUrl ? {} : { background: getPlaceholderGrad(i) }}>
                {coverUrl && <Image className='prod-cover' src={coverUrl} mode='aspectFill' />}
                {p.is_hot && <View className='prod-hot'><Text className='prod-hot-t'>热</Text></View>}
              </View>
              <View className='prod-info'>
                <Text className='prod-name'>{p.model || p.name}</Text>
                {hasPrice ? (
                  <View className='prod-price-row'>
                    {hasDiscount ? (
                      <>
                        <Text className='prod-price-discount'>¥{parseFloat(p.discount_price).toFixed(2)}</Text>
                        <Text className='prod-price-original'>¥{parseFloat(p.price).toFixed(2)}</Text>
                      </>
                    ) : (
                      <Text className='prod-price'>¥{parseFloat(p.price).toFixed(2)}</Text>
                    )}
                  </View>
                ) : (
                  <Text className='prod-cat'>{p.category_name}</Text>
                )}
              </View>
            </View>
          )
        })}
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
        <View className='load-more' onClick={() => loadProducts(page + 1, activeL3 ?? activeL2, keyword)}>
          <Text className='load-more-text'>加载更多</Text>
        </View>
      )}
      {!hasMore && products.length > 0 && (
        <View className='no-more'><Text className='no-more-text'>· 已加载全部 ·</Text></View>
      )}
    </View>
  )
}

function findNode(nodes, id) {
  for (const n of nodes) {
    if (n.id === id) return n
    if (n.children?.length) {
      const found = findNode(n.children, id)
      if (found) return found
    }
  }
  return null
}
