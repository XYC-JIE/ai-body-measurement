// pages/update-password/update-password.js
const { request } = require('../../utils/request');

Page({
  data: {
    currentUsername: '',   // 当前用户名
    oldPassword: '',       // 旧密码
    newPassword: '',       // 新密码
    confirmNewPassword: '',   // 确认密码
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

  // 旧密码输入处理
  onOldPasswordInput(e) {
    this.setData({ 
      oldPassword: e.detail.value,
      errorMsg: ''
    });
  },

  // 新密码输入处理
  onNewPasswordInput(e) {
    this.setData({ 
      newPassword: e.detail.value,
      errorMsg: ''
    });
  },

  // 确认密码输入处理
  onConfirmNewPasswordInput(e) {
    this.setData({ 
      confirmNewPassword: e.detail.value,
      errorMsg: ''
    });
  },

  // 更新密码
  async updatePassword() {
    const { oldPassword, newPassword, confirmNewPassword } = this.data;
    
    // 表单验证
    if (!oldPassword) {
      this.setData({ errorMsg: '请输入旧密码' });
      return;
    }
    
    if (!newPassword) {
      this.setData({ errorMsg: '请输入新密码' });
      return;
    }
    
    if (newPassword.length < 6) {
      this.setData({ errorMsg: '密码长度至少6位' });
      return;
    }
    
    if (newPassword !== confirmNewPassword) {
      this.setData({ errorMsg: '两次输入的密码不一致' });
      return;
    }
    
    this.setData({ 
      isUpdating: true,
      errorMsg: ''
    });

    try {
      // 调用后端API更新密码
      await request('/auth/update-password', {
        method: 'PATCH',
        data: {
          old_password: oldPassword,
          new_password: newPassword
        }
      });
      
      wx.showToast({
        title: '密码更新成功',
        icon: 'success',
        duration: 1500,
        complete: () => {
          setTimeout(() => {
            // 清除本地存储的登录信息
            wx.clearStorageSync();
            // 跳转到登录页面
            wx.reLaunch({
              url: '/pages/user/user'
            });
          }, 1500);
        }
      });
      
    } catch (error) {
      console.error('更新密码失败:', error);
      
      let errorMsg = '更新失败，请重试';
      if (error.message.includes('旧密码不正确')) {
        errorMsg = '旧密码不正确';
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