import axios from 'axios'
import config from '@/bot.config'

const request = axios.create({
  ...config.http
})

request.defaults.headers['Authorization'] = config.http.token

request.interceptors.request.use(c => {
  return c
})

request.interceptors.response.use(
  res => {
    return res.data
  },
  err => Promise.reject(err)
)

export default request
