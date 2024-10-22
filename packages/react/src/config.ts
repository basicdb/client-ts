export const SERVER_URL = "https://api.basic.tech"
// export const WS_URL = `${SERVER_URL}/ws`

export const log = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(...args)
  }
}