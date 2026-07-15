import { useState, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { request } from '../../utils/api'
import './index.scss'

export default function CompanyPage() {
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      const res = await request('/company')
      setCompany(res)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const callPhone = () => {
    if (company?.phone) {
      Taro.makePhoneCall({ phoneNumber: company.phone })
    }
  }

  if (loading) {
    return (
      <View className='co-loading'>
        <Text className='co-loading-text'>加载中…</Text>
      </View>
    )
  }

  if (!company) {
    return (
      <View className='co-loading'>
        <Text className='co-loading-text'>暂无数据</Text>
      </View>
    )
  }

  const paragraphs = (company.description || '').split('\n').filter(p => p.trim())

  return (
    <View className='company'>
      {/* Hero */}
      <View className='co-hero'>
        <Text className='co-wm'>A</Text>
        <View className='co-hero-body'>
          <Text className='co-name'>{company.company_name || '箭牌卫浴'}</Text>
          {company.slogan ? <Text className='co-slogan'>{company.slogan}</Text> : null}
        </View>
      </View>

      {/* About */}
      {paragraphs.length > 0 && (
        <View className='co-section'>
          <View className='co-section-hd'>
            <Text className='co-section-label'>关于我们</Text>
          </View>
          <View className='co-desc-block'>
            {paragraphs.map((p, i) => (
              <Text key={i} className='co-desc'>{p}</Text>
            ))}
          </View>
        </View>
      )}

      {/* Contact */}
      {(company.phone || company.address || company.email || company.wechat) && (
        <View className='co-section'>
          <View className='co-section-hd'>
            <Text className='co-section-label'>联系我们</Text>
          </View>
          <View className='co-contact-card'>
            {company.phone ? (
              <View className='co-contact-row' onClick={callPhone}>
                <Text className='co-contact-icon'>电</Text>
                <View className='co-contact-info'>
                  <Text className='co-contact-key'>联系电话</Text>
                  <Text className='co-contact-val co-contact-val--link'>{company.phone}</Text>
                </View>
              </View>
            ) : null}
            {company.wechat ? (
              <View className='co-contact-row'>
                <Text className='co-contact-icon'>微</Text>
                <View className='co-contact-info'>
                  <Text className='co-contact-key'>微信号</Text>
                  <Text className='co-contact-val'>{company.wechat}</Text>
                </View>
              </View>
            ) : null}
            {company.email ? (
              <View className='co-contact-row'>
                <Text className='co-contact-icon'>邮</Text>
                <View className='co-contact-info'>
                  <Text className='co-contact-key'>电子邮箱</Text>
                  <Text className='co-contact-val'>{company.email}</Text>
                </View>
              </View>
            ) : null}
            {company.address ? (
              <View className='co-contact-row co-contact-row--last'>
                <Text className='co-contact-icon'>址</Text>
                <View className='co-contact-info'>
                  <Text className='co-contact-key'>公司地址</Text>
                  <Text className='co-contact-val'>{company.address}</Text>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      )}

      <View className='co-footer'>
        <Text className='co-footer-text'>ARROW · 箭牌卫浴</Text>
      </View>
    </View>
  )
}
