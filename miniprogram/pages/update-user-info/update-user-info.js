const { request } = require('../../utils/request');

Page({
  data: {
    currentUsername: '',   // 当前用户名
    newUsername: '',       // 新用户名
    errorMsg: '',          // 错误提示
    isUpdating: false,     // 更新中状态
    userId: '',            // 当前用户ID
  },

  onLoad() {
    // 检查用户是否登录
    const token = wx.getStorageSync('token');
    const userId = wx.getStorageSync('userId');
    
    if (!token || !userId) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
        duration: 1500,
        complete: () => {
          setTimeout(() => {
            wx.switchTab({
              url: '/pages/user/user'
            });
          }, 1500);
        }
      });
      return;
    }
    
    this.setData({ userId });
    this.getCurrentUserInfo();
  },

  // 获取当前用户信息
  async getCurrentUserInfo() {
    try {
      const userInfo = await request('/auth/user-info');
      this.setData({
        currentUsername: userInfo.username
      });
    } catch (error) {
      console.error('获取用户信息失败:', error);
      wx.showToast({
        title: '获取用户信息失败',
        icon: 'none'
      });
    }
  },

  // 用户名输入处理
  onUsernameInput(e) {
    const newUsername = e.detail.value.trim();
    this.setData({ 
      newUsername,
      errorMsg: newUsername.length < 3 ? '用户名长度至少3位' : ''
    });
  },

  // 更新用户名
  async updateUsername() {
    const { newUsername, currentUsername } = this.data;
    
    // 验证输入
    if (!newUsername) {
      this.setData({ errorMsg: '请输入新用户名' });
      return;
    }
    
    if (newUsername.length < 3) {
      this.setData({ errorMsg: '用户名长度至少3位' });
      return;
    }
    
    if (newUsername === currentUsername) {
      this.setData({ errorMsg: '新用户名不能与当前用户名相同' });
      return;
    }
    
    this.setData({ 
      isUpdating: true,
      errorMsg: ''
    });

    try {
      // 调用后端API更新用户名
      await request('/auth/update-username', {
        method: 'PATCH',
        data: {
          new_username: newUsername
        }
      });
      wx.setStorageSync('username', newUsername);
      
      wx.showToast({
        title: '更新成功',
        icon: 'success',
        duration: 1500,
        complete: () => {
          setTimeout(() => {
            // 强制刷新前页面数据
          const pages = getCurrentPages();
          const prevPage = pages[pages.length - 2];
          if (prevPage && prevPage.getUserInfo) {
            prevPage.getUserInfo();
          }
          
          wx.navigateBack({ delta: 1 });
          }, 1500);
        }
      });
      
    } catch (error) {
      console.error('更新失败:', error);
      
      let errorMsg = '更新失败，请重试';
      if (error.message.includes('该用户名已被使用')) {
        errorMsg = '该用户名已被使用';
      } else if (error.message.includes('401')) {
        errorMsg = '登录已过期，请重新登录';
      } else if (error.message.includes('网络连接失败')) {
        errorMsg = '无法连接服务器，请检查网络';
      }
      
      this.setData({ errorMsg });
      wx.showToast({
        title: errorMsg,
        icon: 'none'
      });
    } finally {
      this.setData({ isUpdating: false });
    }
  }
});