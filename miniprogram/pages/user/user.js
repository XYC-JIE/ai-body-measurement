const { request } = require('../../utils/request');

Page({
  data: {
    userInfo: null,
    profile: null,
    measurementCount: 0,
    userId:'',
    username:'',
    password:'',
    showRegister:false,
    confirmPassword:'',
    isRefreshing:false
  },

  // 跳转到修改个人信息页面
  updateUserName() {
    wx.navigateTo({
      url: '/pages/update-user-info/update-user-info'
    });
  },

  // 跳转到修改密码页面
  updatePassword() {
    wx.navigateTo({
      url: '/pages/update-password/update-password'
    });
  },

  //跳转到BMI计算页面
  bmiCalculate(){
    wx.navigateTo({
      url: '/pages/bmi/bmi'
    });
  },

  goToRegister(){
    this.setData({
      showRegister:true,
      userId:''
    })
    console.log(this.data.showRegister)
    console.log(this.data.userId)
  },

  onUsernameInput(e) {
    this.setData({ username: e.detail.value });
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value });
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
    // 添加延迟确保后端数据更新
    this.setData({ isRefreshing: true }, () => {
      setTimeout(() => {
        this.initData();
        this.setData({ isRefreshing: false });
      }, 800); // 0.8秒延迟
    });
  },
  initData(){
    this.getUserInfo();
    const userId=wx.getStorageSync('userId');
    this.setData({ userId: userId || '' });
    if (userId) {
      this.loadProfile();
      this.getMeasurementCount();
    }
  },

  async getUserInfo() {
    try {
      const token = wx.getStorageSync('token');
      if (!token) {
        this.setData({ userInfo: null });
        return;
      }
      const userInfo = await request('/auth/user-info');
      this.setData({ userInfo });
    } catch (error) {
      this.setData({ userInfo: null });
      wx.showToast({
        title: '请重新登录',
        icon: 'none'
      });
    }
  },

  async getMeasurementCount() {
    try {
      const res = await request('/measurement/count');
      this.setData({ measurementCount: res.count });
    } catch (error) {
      console.error('获取测量次数失败', error);
    }
  },

  async loadProfile() {
    try { this.setData({ profile: await request('/auth/profile') }); }
    catch (e) { this.setData({ profile: null }); }
  },
  navigateToProfile() { wx.navigateTo({ url: '/pages/profile/profile' }); },

  handleLogout() {
    let that=this
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('token');
          wx.removeStorageSync('userId');
          that.initData();
        }
      }
    });
  },

  async handleLogin() {
    const { username, password } = this.data;
    if (!username || !password) {
      wx.showToast({
        title: '请输入用户名和密码',
        icon: 'none'
      });
      return;
    }
  
    try {
      const res = await request('/auth/login', {
        method: 'POST',
        data: {
          username,
          password
        }
      });
  
      // 保存登录信息
      wx.setStorageSync('token', res.access_token);
      wx.setStorageSync('userId', res.user_id);
      
      wx.showToast({
        title: '登录成功',
        icon: 'success',
        duration: 500
      });
      this.setData({
        username:'',
        password:''
      })
      this.initData();
      
    } catch (error) {
      wx.showToast({
        title: error.message || '登录失败',
        icon: 'none'
      });
    }
  },
  onUsernameInput(e) {
    this.setData({ username: e.detail.value });
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value });
  },

  onConfirmPasswordInput(e) {
    this.setData({ confirmPassword: e.detail.value });
  },
  goToLogin(){
    this.setData({
      showRegister:false
    })
  },

  async handleRegister() {
    const { username, password, confirmPassword } = this.data;
    
    if (!username || !password || !confirmPassword) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }

    if (password !== confirmPassword) {
      wx.showToast({
        title: '两次密码不一致',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true });

    try {
      await request('/auth/register', {
        method: 'POST',
        data: {
          username,
          password
        }
      });

      wx.showToast({
        title: '注册成功',
        icon: 'success'
      });

     this.setData({
       showRegister:false,
       userId:'',
       username:'',
       password:'',
       confirmPassword:'',
     })

    } catch (error) {
      console.error('注册失败:', error);
      wx.showToast({
        title: error.message || '注册失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  }
});

