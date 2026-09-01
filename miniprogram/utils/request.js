const BASE_URL = 'http://127.0.0.1:8000/api';

const request = (url, options = {}) => {
  return new Promise((resolve, reject) => {
    // 定义不需要token的白名单路径
    const whiteList = ['/auth/login', '/auth/register'];
    
    // 获取token，如果不在白名单中才需要token
    const token = !whiteList.includes(url) ? wx.getStorageSync('token') : '';
    
    wx.request({
      url: `${BASE_URL}${url}`,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.header
      },  
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else if (res.statusCode === 401) {
          // 保存当前页面路径
          const pages = getCurrentPages();
          const currentPage = pages[pages.length - 1];
          const currentPath = `/${currentPage.route}`;
          wx.setStorageSync('redirectPath', currentPath);
          
          // 清除token并跳转到登录页
          wx.removeStorageSync('token');
          wx.removeStorageSync('userId');
          wx.switchTab({
            url: '/pages/user/user',
            success: () => {
              wx.showToast({
                title: '请先登录',
                icon: 'none'
              });
              reject(new Error('用户名或密码错误'));
            },
            fail: (error) => {
              console.error('页面跳转失败:', error);
              wx.showToast({
                title: '页面跳转失败',
                icon: 'none'
              });
              reject(new Error('页面跳转失败'));
            }
          });
        } else {
          reject(new Error(res.data?.detail || '请求失败'));
        }
      },
      fail: (error) => {
        console.error('请求失败:', error);
        reject(new Error('网络连接失败，请检查服务器是否启动'));
      }
    });
  });
};

module.exports = { request, BASE_URL };