// services/qqMusicService.js - QQ音乐API服务
const axios = require('axios')
const logger = require('../utils/logger')
const { redis } = require('../config/redis')

class QQMusicService {
  constructor() {
    this.baseUrl = 'https://c.y.qq.com'
    this.timeout = 10000
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  }

  // 创建请求实例
  createRequest() {
    return axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'User-Agent': this.userAgent,
        'Referer': 'https://y.qq.com/',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
      }
    })
  }

  // 搜索歌手
  async searchArtist(keyword, page = 1, limit = 20) {
    try {
      const request = this.createRequest()
      
      const response = await request.get('/soso/fcgi-bin/client_search_cp', {
        params: {
          ct: 24,
          qqmusic_ver: 1298,
          new_json: 1,
          remoteplace: 'txt.yqq.singer',
          searchid: Date.now(),
          t: 2, // 搜索歌手
          aggr: 1,
          cr: 1,
          catZhida: 1,
          lossless: 0,
          flag_qc: 0,
          p: page,
          n: limit,
          w: keyword,
          g_tk: 5381,
          loginUin: 0,
          hostUin: 0,
          format: 'json',
          inCharset: 'utf8',
          outCharset: 'utf-8',
          notice: 0,
          platform: 'yqq.json',
          needNewCode: 0
        }
      })

      if (response.data.code !== 0) {
        throw new Error(`QQ音乐API错误: ${response.data.message || '未知错误'}`)
      }

      return response.data.data.singer

    } catch (error) {
      logger.error('搜索歌手失败:', error)
      this.handleApiError(error)
    }
  }

  // 获取歌手详情
  async getArtistInfo(artistMid) {
    try {
      const request = this.createRequest()
      
      const response = await request.get('/v8/fcg-bin/fcg_v8_singer_track_cp.fcg', {
        params: {
          g_tk: 5381,
          loginUin: 0,
          hostUin: 0,
          format: 'json',
          inCharset: 'utf8',
          outCharset: 'utf-8',
          notice: 0,
          platform: 'yqq.json',
          needNewCode: 0,
          singermid: artistMid,
          order: 'listen',
          begin: 0,
          num: 1,
          songstatus: 1
        }
      })

      if (response.data.code !== 0) {
        throw new Error(`获取歌手信息失败: ${response.data.message || '未知错误'}`)
      }

      return response.data.data

    } catch (error) {
      logger.error('获取歌手信息失败:', error)
      this.handleApiError(error)
    }
  }

  // 获取歌手歌曲列表
  async getArtistSongs(artistMid, page = 0, limit = 50) {
    try {
      const request = this.createRequest()
      
      const response = await request.get('/v8/fcg-bin/fcg_v8_singer_track_cp.fcg', {
        params: {
          g_tk: 5381,
          loginUin: 0,
          hostUin: 0,
          format: 'json',
          inCharset: 'utf8',
          outCharset: 'utf-8',
          notice: 0,
          platform: 'yqq.json',
          needNewCode: 0,
          singermid: artistMid,
          order: 'time', // 按时间排序，获取最新歌曲
          begin: page * limit,
          num: limit,
          songstatus: 1
        }
      })

      if (response.data.code !== 0) {
        throw new Error(`获取歌手歌曲失败: ${response.data.message || '未知错误'}`)
      }

      return response.data.data

    } catch (error) {
      logger.error('获取歌手歌曲失败:', error)
      this.handleApiError(error)
    }
  }

  // 获取歌曲详情
  async getSongInfo(songMid) {
    try {
      const request = this.createRequest()
      
      const response = await request.get('/v8/fcg-bin/fcg_play_single_song.fcg', {
        params: {
          songmid: songMid,
          tpl: 'yqq_song_detail',
          format: 'json',
          g_tk: 5381,
          loginUin: 0,
          hostUin: 0,
          inCharset: 'utf8',
          outCharset: 'utf-8',
          notice: 0,
          platform: 'yqq.json',
          needNewCode: 0
        }
      })

      if (response.data.code !== 0) {
        throw new Error(`获取歌曲信息失败: ${response.data.message || '未知错误'}`)
      }

      return response.data.data[0]

    } catch (error) {
      logger.error('获取歌曲信息失败:', error)
      this.handleApiError(error)
    }
  }

  // 获取歌曲播放链接
  async getSongPlayUrl(songMid, quality = 'M500') {
    try {
      const request = this.createRequest()
      
      const response = await request.get('/cgi-bin/musicu.fcg', {
        params: {
          format: 'json',
          data: JSON.stringify({
            req_0: {
              module: 'vkey.GetVkeyServer',
              method: 'CgiGetVkey',
              param: {
                guid: '10000',
                songmid: [songMid],
                songtype: [0],
                uin: '0',
                loginflag: 1,
                platform: '20'
              }
            }
          })
        }
      })

      if (response.data.code !== 0) {
        throw new Error(`获取播放链接失败: ${response.data.message || '未知错误'}`)
      }

      const vkeyData = response.data.req_0.data
      if (vkeyData.midurlinfo && vkeyData.midurlinfo.length > 0) {
        const purl = vkeyData.midurlinfo[0].purl
        if (purl) {
          return `https://dl.stream.qqmusic.qq.com/${purl}`
        }
      }

      return null

    } catch (error) {
      logger.error('获取歌曲播放链接失败:', error)
      return null
    }
  }

  // 获取歌词
  async getLyrics(songMid) {
    try {
      const request = this.createRequest()
      
      const response = await request.get('/lyric/fcgi-bin/fcg_query_lyric_new.fcg', {
        params: {
          songmid: songMid,
          g_tk: 5381,
          loginUin: 0,
          hostUin: 0,
          format: 'json',
          inCharset: 'utf8',
          outCharset: 'utf-8',
          notice: 0,
          platform: 'yqq.json',
          needNewCode: 0
        }
      })

      if (response.data.code !== 0) {
        throw new Error(`获取歌词失败: ${response.data.message || '未知错误'}`)
      }

      // 解码歌词
      const lyric = response.data.lyric ? Buffer.from(response.data.lyric, 'base64').toString() : ''
      const trans = response.data.trans ? Buffer.from(response.data.trans, 'base64').toString() : ''

      return {
        lyric,
        trans
      }

    } catch (error) {
      logger.error('获取歌词失败:', error)
      return { lyric: '', trans: '' }
    }
  }

  // 获取热门歌手
  async getPopularArtists(area = -100, genre = -100, index = -100, page = 1, limit = 50) {
    try {
      const request = this.createRequest()
      
      const response = await request.get('/v8/fcg-bin/v8.fcg', {
        params: {
          g_tk: 5381,
          loginUin: 0,
          hostUin: 0,
          format: 'json',
          inCharset: 'utf8',
          outCharset: 'utf-8',
          notice: 0,
          platform: 'yqq.json',
          needNewCode: 0,
          channel: 'singer',
          page: 'list',
          key: 'all_all_all',
          pagesize: limit,
          pagenum: page,
          area: area,
          genre: genre,
          index: index,
          sin: (page - 1) * limit,
          ein: page * limit - 1
        }
      })

      if (response.data.code !== 0) {
        throw new Error(`获取热门歌手失败: ${response.data.message || '未知错误'}`)
      }

      return response.data.data

    } catch (error) {
      logger.error('获取热门歌手失败:', error)
      this.handleApiError(error)
    }
  }

  // 获取新歌榜单
  async getNewSongRank(topId = 27) {
    try {
      const request = this.createRequest()
      
      const response = await request.get('/v8/fcg-bin/fcg_v8_toplist_cp.fcg', {
        params: {
          g_tk: 5381,
          loginUin: 0,
          hostUin: 0,
          format: 'json',
          inCharset: 'utf8',
          outCharset: 'utf-8',
          notice: 0,
          platform: 'yqq.json',
          needNewCode: 0,
          tpl: 3,
          page: 'detail',
          type: 'top',
          topid: topId,
          num: 100,
          song_begin: 0,
          song_num: 100
        }
      })

      if (response.data.code !== 0) {
        throw new Error(`获取新歌榜单失败: ${response.data.message || '未知错误'}`)
      }

      return response.data.data

    } catch (error) {
      logger.error('获取新歌榜单失败:', error)
      this.handleApiError(error)
    }
  }

  // 批量获取歌手最新歌曲
  async getArtistLatestSongs(artistMid, maxCount = 10) {
    try {
      const result = await this.getArtistSongs(artistMid, 0, maxCount)
      
      if (result && result.list) {
        return result.list.slice(0, maxCount)
      }
      
      return []

    } catch (error) {
      logger.error('批量获取歌手最新歌曲失败:', error)
      throw error
    }
  }

  // 检查歌手是否有新歌
  async checkArtistNewSongs(artistMid, lastSongId = null) {
    try {
      const songs = await this.getArtistLatestSongs(artistMid, 5)
      
      if (!songs || songs.length === 0) {
        return []
      }

      // 如果没有上次检查的歌曲ID，返回最新的一首
      if (!lastSongId) {
        return [songs[0]]
      }

      // 查找新歌曲
      const newSongs = []
      for (const song of songs) {
        if (song.songmid === lastSongId) {
          break
        }
        newSongs.push(song)
      }

      return newSongs

    } catch (error) {
      logger.error('检查歌手新歌失败:', error)
      throw error
    }
  }

  // 缓存API响应
  async cacheApiResponse(key, data, expireSeconds = 300) {
    try {
      await redis.set(`qqmusic_api:${key}`, data, expireSeconds)
    } catch (error) {
      logger.warn('缓存API响应失败:', error)
    }
  }

  // 获取缓存的API响应
  async getCachedApiResponse(key) {
    try {
      return await redis.get(`qqmusic_api:${key}`)
    } catch (error) {
      logger.warn('获取缓存API响应失败:', error)
      return null
    }
  }

  // 带缓存的API请求
  async cachedRequest(cacheKey, requestFn, expireSeconds = 300) {
    try {
      // 先尝试从缓存获取
      const cached = await this.getCachedApiResponse(cacheKey)
      if (cached) {
        logger.info(`使用缓存数据: ${cacheKey}`)
        return cached
      }

      // 缓存未命中，执行实际请求
      const result = await requestFn()
      
      // 缓存结果
      await this.cacheApiResponse(cacheKey, result, expireSeconds)
      
      return result

    } catch (error) {
      logger.error('缓存请求失败:', error)
      throw error
    }
  }

  // 延迟函数
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // 处理API错误
  handleApiError(error) {
    if (error.response) {
      const { status, data } = error.response
      logger.error(`QQ音乐API错误 ${status}:`, data)
      
      switch (status) {
        case 403:
          throw new Error('访问被拒绝，可能需要更新请求头')
        case 429:
          throw new Error('请求过于频繁，请稍后重试')
        case 500:
          throw new Error('QQ音乐服务器内部错误')
        default:
          throw new Error(`QQ音乐API错误: ${data.message || '未知错误'}`)
      }
    } else if (error.request) {
      logger.error('QQ音乐API请求失败:', error.request)
      throw new Error('网络连接失败，请检查网络设置')
    } else {
      logger.error('QQ音乐API请求配置错误:', error.message)
      throw new Error('请求配置错误')
    }
  }

  // 格式化歌手信息
  formatArtistInfo(rawData) {
    return {
      qqMusicArtistId: rawData.singer_mid,
      name: rawData.singer_name,
      avatar: `https://y.gtimg.cn/music/photo_new/T001R300x300M000${rawData.singer_mid}.jpg`,
      fanCount: rawData.fans_num || 0,
      songCount: rawData.song_num || 0,
      albumCount: rawData.album_num || 0,
      region: this.mapRegion(rawData.area),
      type: rawData.singer_type === 1 ? 'solo' : 'group',
      description: rawData.singer_desc || ''
    }
  }

  // 格式化歌曲信息
  formatSongInfo(rawData) {
    return {
      songId: rawData.songmid,
      title: rawData.songname,
      duration: rawData.interval,
      cover: `https://y.gtimg.cn/music/photo_new/T002R300x300M000${rawData.albummid}.jpg`,
      releaseTime: new Date(rawData.time_public),
      album: {
        id: rawData.albummid,
        name: rawData.albumname,
        cover: `https://y.gtimg.cn/music/photo_new/T002R300x300M000${rawData.albummid}.jpg`
      },
      stats: {
        playCount: 0, // QQ音乐不提供播放量
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
        collectCount: 0
      }
    }
  }

  // 映射地区代码
  mapRegion(areaCode) {
    const regionMap = {
      200: 'mainland',
      400: 'hongkong',
      300: 'taiwan',
      60: 'korea',
      17: 'japan',
      16: 'western'
    }
    return regionMap[areaCode] || 'other'
  }
}

// 创建服务实例
const qqMusicService = new QQMusicService()

module.exports = qqMusicService