// pages/measure/measure.js
const {
  request,
  BASE_URL
} = require('../../utils/request.js');

Page({
  data: {
    height: '',
    frontImage: '',
    sideImage: '',
    frontImageUrl: "",
    sideImageUrl: "",
    showGuide: false,
    showCamera: false,
    currentPhotoType: 'front',
    hasCameraAuth: false,
    measuring: false,
    guideSteps: [{
        title: '拍摄要求',
        content: '请穿着贴身衣物，站立姿势自然，背景简单纯色'
      },
      {
        title: '正面照片',
        content: '请确保全身在画面中，双臂自然下垂'
      },
      {
        title: '侧面照片',
        content: '请侧身站立，保持自然姿势，确保全身在画面中'
      }
    ]
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
  },

  onLoad() {
    this.checkStoredData();
    this.checkCameraPermission();
  },

  // 检查摄像头权限
  checkCameraPermission() {
    const that = this;
    wx.getSetting({
      success(res) {
        if (res.authSetting['scope.camera']) {
          // 用户已经授权
          that.setData({
            hasCameraAuth: true
          });
        } else {
          // 用户还未授权，请求授权
          that.requestCameraAuth();
        }
      },
      fail(err) {
        console.error('检查权限设置失败', err);
      }
    });
  },

  // 请求摄像头授权
  requestCameraAuth() {
    const that = this;
    wx.authorize({
      scope: 'scope.camera',
      success() {
        // 用户同意授权
        that.setData({
          hasCameraAuth: true
        });
        console.log('摄像头授权成功');
      },
      fail(err) {
        console.error('摄像头授权失败', err);
        // 用户拒绝授权，提示用户手动开启
        that.showAuthGuide();
      }
    });
  },

  // 显示授权指引
  showAuthGuide() {
    wx.showModal({
      title: '需要摄像头权限',
      content: '身体测量需要使用摄像头拍摄正面和侧面照片，请授权摄像头权限',
      confirmText: '去设置',
      success(res) {
        if (res.confirm) {
          // 打开设置页面
          wx.openSetting({
            success(settingRes) {
              if (settingRes.authSetting['scope.camera']) {
                console.log('用户已在设置中授权摄像头权限');
              }
            }
          });
        }
      }
    });
  },

  // 在打开相机的方法中添加权限检查
  openCamera(type) {
    if (!this.data.hasCameraAuth) {
      this.showAuthGuide();
      return;
    }
    
    this.setData({
      currentPhotoType: type,
      showCamera: true
    });
  },

  onHeightInput(e) {
    this.setData({
      height: e.detail.value
    });
  },

  // 显示选择菜单：拍摄或从相册选择
  onImageSelect(e) {
    const { type } = e.currentTarget.dataset;
    const that = this;
    
    wx.showActionSheet({
      itemList: ['拍摄', '从相册选择'],
      success(res) {
        if (res.tapIndex === 0) {
          // 拍摄
          that.openCamera(type);
        } else {
          // 从相册选择
          that.chooseImage(type, ['album']);
        }
      },
      fail(res) {
        console.log('选择失败', res.errMsg);
      }
    });
  },

  // 关闭相机
  closeCamera() {
    this.setData({
      showCamera: false
    });
  },

  // 拍照
  takePhoto() {
    const ctx = wx.createCameraContext();
    const { currentPhotoType } = this.data;
    
    ctx.takePhoto({
      quality: 'high',
      success: (res) => {
        const tempImagePath = res.tempImagePath;
        
        if (currentPhotoType === 'front') {
          this.setData({
            frontImage: tempImagePath,
          });
        } else {
          this.setData({
            sideImage: tempImagePath
          });
        }
        
        // 关闭相机
        this.closeCamera();
      },
      fail: (error) => {
        console.error('拍照失败', error);
        wx.showToast({
          title: '拍照失败',
          icon: 'none'
        });
      }
    });
  },

  // 相机错误处理
  cameraError(e) {
    console.error('相机错误:', e.detail);
    wx.showToast({
      title: '相机启动失败',
      icon: 'none'
    });
    this.closeCamera();
  },

  // 从相册选择图片
  chooseImage(type, sourceType) {
    const that = this;
    
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: sourceType,
      success(res) {
        const tempFilePaths = res.tempFilePaths;
        
        if (type === 'front') {
          that.setData({
            frontImage: tempFilePaths[0],
          });
        } else {
          that.setData({
            sideImage: tempFilePaths[0]
          });
        }
      },
      fail(error) {
        console.error('选择图片失败', error);
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        });
      }
    });
  },

  // 切换指南显示
  toggleGuide() {
    this.setData({
      showGuide: !this.data.showGuide
    });
  },

  // 上传文件到服务器
  uploadFile(tempImage) {
    const that = this;
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: `${BASE_URL}/upload/upload`,
        filePath: tempImage,
        name: 'file',
        header: {
          'Authorization': `Bearer ${wx.getStorageSync('token')}`
        },
        success: (res) => {
          let data = JSON.parse(res.data);
          if (data.url) {
            resolve(data.url);
          } else {
            reject(new Error('上传失败'));
          }
        },
        fail: (error) => {
          reject(error);
        }
      });
    });
  },

  // 清除数据
  clearData() {
    this.setData({
      height: '',
      frontImage: '',
      sideImage: '',
      frontImageUrl: "",
      sideImageUrl: ""
    });
    
    // 清除本地存储
    wx.removeStorageSync('measurementData');
    
  },

  // 检查本地存储的数据
  checkStoredData() {
    const data = wx.getStorageSync('measurementData');
    if (data) {
      this.setData({
        height: data.height || '',
        frontImage: data.frontImage || '',
        sideImage: data.sideImage || ''
      });
    }
  },

  // 保存数据到本地存储
  saveToLocalStorage() {
    const data = {
      height: this.data.height,
      frontImage: this.data.frontImage,
      sideImage: this.data.sideImage
    };
    
    wx.setStorageSync('measurementData', data);
  },

  // 处理测量
  async handleMeasure() {
    try {
      // 检查用户是否登录
      let userId = wx.getStorageSync("userId");
      if (!userId) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/user/user',
          });
        }, 2000);
        return;
      }
      
      // 检查数据完整性
      if (!this.data.height || !this.data.frontImage || !this.data.sideImage) {
        wx.showToast({
          title: '请填写完整信息',
          icon: 'none'
        });
        return;
      }
      
      this.setData({
        measuring: true
      });

      // 上传图片到服务器
      if (!this.data.frontImageUrl || !this.data.sideImageUrl) {
        const frontImageUrl = await this.uploadFile(this.data.frontImage);
        const sideImageUrl = await this.uploadFile(this.data.sideImage);
        this.setData({
          frontImageUrl: frontImageUrl,
          sideImageUrl: sideImageUrl,
        });
      }

      // 发送测量请求
      const res = await request('/measurement/', {
        method: 'POST',
        data: {
          height: parseFloat(this.data.height),
          front_image_url: this.data.frontImageUrl,
          side_image_url: this.data.sideImageUrl,
          details: []
        },
        header: {
          'Authorization': `Bearer ${wx.getStorageSync('token')}`
        },
      });

      wx.showToast({
        title: '测量成功',
        icon: 'success',
        duration: 1500
      });

      // 在跳转前清除数据
      this.clearData();

      setTimeout(() => {
        wx.switchTab({
          url: `/pages/result/result`
        });
      }, 1500);
    } catch (error) {
      console.error('测量失败', error);
      wx.showToast({
        title: '测量失败',
        icon: 'none'
      });
    } finally {
      this.setData({
        measuring: false
      });
    }
  }
});