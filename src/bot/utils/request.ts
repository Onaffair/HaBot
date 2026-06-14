import axios from 'axios'
import { BeanFactory } from '@/core/bean'

const factory = BeanFactory.getInstance()

const request = axios.create({
  baseURL: process.env.HTTP_BASE_URL,
  timeout: 30000,
})
request.defaults.headers['Authorization'] = process.env.HTTP_TOKEN
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
