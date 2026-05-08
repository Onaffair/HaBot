import axios from 'axios'
import config from '@config'

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
  err => Promise.reject(err.message)
)

export default request
