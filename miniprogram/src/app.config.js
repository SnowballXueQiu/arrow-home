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
    custom: true,
    color: '#92958d',
    selectedColor: '#b95f3c',
    backgroundColor: '#fbfaf6',
    borderStyle: 'black',
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
    navigationBarTitleText: '正通科技',
    navigationBarTextStyle: 'black'
  },
  lazyCodeLoading: 'requiredComponents'
})
