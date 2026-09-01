// share.js
const {
  request,
  BASE_URL
} = require('../../utils/request.js');

Page({
  data: {
    thought: "",
    images: [],
    articles: [],
    showList: false
  },

  onShow() {
    wx.hideTabBar({
      animation: true
    });
    this.fetchArticles();
  },

  onUnload() {
    wx.showTabBar({
      animation: true
    });
  },

  // 获取文章列表
  fetchArticles: function() {
    wx.request({
      url: `${BASE_URL}/article/my-articles`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({
            articles: res.data.articles // 注意Python返回的是{articles: [...]}格式
          });
        } else {
          wx.showToast({
            title: '加载失败',
            icon: 'none'
          });
        }
      }
    });
  },

  // 选择图片
  chooseImage() {
    if (this.data.images.length >= 9) {
      wx.showToast({
        title: '最多上传9张图片',
        icon: 'none'
      });
      return;
    }
    
    wx.chooseImage({
      count: 9 - this.data.images.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({
          images: this.data.images.concat(res.tempFilePaths)
        });
      }
    });
  },

  // 删除图片
  deleteImage: function(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.images;
    images.splice(index, 1);
    this.setData({
      images: images
    });
  },

  // 预览图片
  previewImage: function(e) {
    const index = e.currentTarget.dataset.index;
    wx.previewImage({
      current: this.data.images[index],
      urls: this.data.images
    });
  },

  // 输入框内容变化
  onInputThought(e) {
    this.setData({
      thought: e.detail.value
    });
  },

  // 返回上一页
  navigateBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
    } else {
      wx.reLaunch({ url: '/pages/measure/measure' });
    }
  },

  // 发布文章
  handleShare() {
    const { thought, images } = this.data;
    
    if (!thought.trim() && images.length === 0) {
      wx.showToast({
        title: '内容不能为空',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: '发布中',
    });

    // 如果有图片，先上传图片
    if (images.length > 0) {
      this.uploadImages(images).then(cloudImages => {
        this.submitArticle(thought, cloudImages);
      }).catch(err => {
        wx.hideLoading();
        wx.showToast({
          title: '图片上传失败',
          icon: 'error'
        });
      });
    } else {
      this.submitArticle(thought, []);
    }
  },

  // 上传图片到服务器
  uploadImages: function(localImages) {
    const uploadTasks = localImages.map(image => {
      return new Promise((resolve, reject) => {
        wx.uploadFile({
          url: `${BASE_URL}/upload/upload`,
          filePath: image,
          name: 'image',
          header: {
            'Authorization': `Bearer ${wx.getStorageSync('token')}`
          },
          success: (res) => {
            const data = JSON.parse(res.data);
            if (res.statusCode === 200) {
              resolve(data.url);
            } else {
              reject(new Error('上传失败'));
            }
          },
          fail: reject
        });
      });
    });
    
    return Promise.all(uploadTasks);
  },

  // 提交文章到服务器
  submitArticle: function(content, images) {
    wx.request({
      url: `${BASE_URL}/article/send`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`,
        'Content-Type': 'application/json'
      },
      data: {
        content: content,
        images: images
      },
      success: (res) => {
        if (res.statusCode === 200) {
          wx.showToast({
            title: '发布成功',
            icon: 'success',
            success: () => {
              this.setData({
                thought: '',
                images: []
              });
              this.fetchArticles();
            }
          });
        } else {
          wx.showToast({
            title: '发布失败',
            icon: 'error'
          });
        }
      },
      fail: () => {
        wx.showToast({
          title: '网络错误',
          icon: 'error'
        });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  // 删除文章
  deleteArticle: function(e) {
    const id = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '提示',
      content: '确定要删除这篇文章吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '删除中',
          });
          
          wx.request({
            url: `${BASE_URL}/article/article/${id}`,
            method: 'DELETE',
            header: {
              'Authorization': `Bearer ${wx.getStorageSync('token')}`
            },
            success: (res) => {
              if (res.statusCode === 200) {
                wx.showToast({
                  title: '删除成功',
                  icon: 'success'
                });
                this.fetchArticles();
              } else {
                wx.showToast({
                  title: '删除失败',
                  icon: 'error'
                });
              }
            },
            fail: () => {
              wx.showToast({
                title: '网络错误',
                icon: 'error'
              });
            },
            complete: () => {
              wx.hideLoading();
            }
          });
        }
      }
    });
  },

  // 切换文章列表显示
  toggleList: function() {
    this.setData({
      showList: !this.data.showList
    });
    
    if (!this.data.showList) {
      this.fetchArticles();
    }
  }
});