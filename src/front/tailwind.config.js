/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // 关闭 Tailwind 预置的 border 样式对 antd 组件边框的干扰
      borderRadius: { DEFAULT: '6px' },
    },
  },
  // 让 Tailwind 的 preflight 不覆盖 antd 的全局样式
  corePlugins: {
    preflight: false,
  },
  plugins: [],
}
