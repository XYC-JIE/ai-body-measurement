Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/measure/measure', text: 'AI首页', icon: '/assets/images/home_selected.png' },
      { pagePath: '/pages/result/result', text: '报告', icon: '/assets/images/report_selected.png' },
      { pagePath: '/pages/user/user', text: '我的', icon: '/assets/images/user_selected.png' }
    ]
  },
  methods: {
    switchTab(e) {
      const { path, index } = e.currentTarget.dataset;
      wx.switchTab({ url: path });
      this.setData({ selected: index });
    }
  }
});
