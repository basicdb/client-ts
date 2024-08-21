import { defineConfig } from '@kubb/core'
import { pluginOas } from '@kubb/plugin-oas'
import { pluginTs } from '@kubb/swagger-ts'
import { pluginSwr } from '@kubb/swagger-swr'


export default defineConfig({
  root: '.',
  input: {
    path: './openapi.json',
  },
  output: {
    path: './src/gen',
    clean: true,
  },
  plugins: [
    pluginOas(
      {
        output: false,
        validate: true,
      },
    ),
    pluginTs(
      {
        output: {
          path: 'models',
        },
      },
    ),
    pluginSwr(
      {
        output: {
          path: 'hooks',
        },
      },
    ),
  ],
})