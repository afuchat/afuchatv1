import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'logo.jpg', 'afuchat-logo.png'],
      manifest: {
        name: 'AfuChat — Post. Chat. Shop. AI. All in One.',
        short_name: 'AfuChat',
        description: 'The all-in-one social app where you can post like X, chat like Telegram, shop, and use built-in AI.',
        theme_color: '#00C2CB',
        background_color: '#0F1114',
        display: 'standalone',
        display_override: ['standalone', 'fullscreen'],
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        id: 'afuchat-pwa',
        categories: ['social', 'communication', 'entertainment', 'shopping'],
        screenshots: [
          {
            src: '/favicon.png',
            sizes: '512x512',
            type: 'image/png',
            form_factor: 'narrow'
          }
        ],
        icons: [
          {
            src: '/favicon.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: '/favicon.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/favicon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/favicon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Feed',
            short_name: 'Feed',
            url: '/feed',
            icons: [{ src: '/favicon.png', sizes: '96x96' }]
          },
          {
            name: 'Chats',
            short_name: 'Chats',
            url: '/chats',
            icons: [{ src: '/favicon.png', sizes: '96x96' }]
          },
          {
            name: 'Shop',
            short_name: 'Shop',
            url: '/shop',
            icons: [{ src: '/favicon.png', sizes: '96x96' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/rhnsjqqtdzlkvqazfcbg\.supabase\.co\/storage\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-storage-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime'],
    exclude: [],
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
}));
