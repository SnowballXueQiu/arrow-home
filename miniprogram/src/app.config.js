export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/products/index',
    'pages/products/detail',
    'pages/mine/index',
    'pages/company/index',
    'pages/cases/index',
    'pages/cases/detail',
  ],
  tabBar: {
    color: '#999999',
    selectedColor: '#1a1a1a',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页'
      },
      {
        pagePath: 'pages/products/index',
        text: '商品'
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的'
      }
    ]
  },
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTitleText: '箭牌卫浴',
    navigationBarTextStyle: 'black'
  }
})
