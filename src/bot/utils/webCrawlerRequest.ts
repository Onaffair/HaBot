import axios from 'axios'

const request = axios.create({
  baseURL: '',
  timeout: 30000,
})
request.interceptors.request.use(c => {
  return c
})
request.interceptors.response.use(
  res => {
    // console.log(res.status);
    return res.data
  },
  err => {
    console.log(`error:${JSON.stringify(err)}`);
    
    return Promise.reject(err.message)
  }
)

export default request
