import axios from 'axios'
import config from '@/bot.config'

const aiReq = axios.create({
  ...config.ai.config
})

aiReq.defaults.headers['Authorization'] = `Bearer ${config.ai.secret}`

aiReq.interceptors.request.use(c => {
  return c
})

aiReq.interceptors.response.use(
  res => {
    return res.data
  },
  err => Promise.reject(err)
)

export default aiReq
