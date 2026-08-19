Component({
  data: {
    selected: 0,
    list: [
      { path: 'pages/index/index', icon: 'home', activeIcon: 'home-active' },
      { path: 'pages/products/index', icon: 'package', activeIcon: 'package-active' },
      { path: 'pages/mine/index', icon: 'profile', activeIcon: 'profile-active' }
    ]
  },
  methods: {
    switchTab(event) {
      const { path, index } = event.currentTarget.dataset
      const selected = Number(index)
      if (selected === this.data.selected) return

      // 选中态由目标页在 useDidShow 时统一更新。这里不提前 setData，
      // 也不在异步回调中回写，避免快速点按时旧路由回调覆盖新页面状态。
      wx.switchTab({
        url: `/${path}`,
        fail: (error) => console.error('底部导航切换失败', error),
      })
    }
  }
})
