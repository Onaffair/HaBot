import axios from 'axios'

const request = axios.create({
  timeout:30000
})

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
