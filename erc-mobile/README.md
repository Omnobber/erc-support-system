# ERC Mobile (Android)

Android wrapper app for the ERC website using `react-native-webview` and Expo.

## 1) Install

```bash
cd erc-mobile
npm install
```

## 2) Set Website URL

Use one of these methods:

1. Environment variable (recommended):

```bash
$env:EXPO_PUBLIC_WEB_APP_URL="https://your-frontend-domain.com"
```

2. Or set `expo.extra.webAppUrl` in [app.json](/E:/public_html/tml%20erc/erc-mobile/app.json).

## 3) Start Android

```bash
npx expo start --android
```

You can run on:
- Android emulator
- Physical Android phone with Expo Go

## Local Network Testing

If your website is running locally:

1. Run frontend with host access:

```bash
cd frontend
npm run dev -- --host
```

2. Use your laptop IP in mobile URL:

```bash
$env:EXPO_PUBLIC_WEB_APP_URL="http://192.168.x.x:5173"
```

3. Make sure phone and laptop are on same Wi-Fi.

## Notes

- If the app shows `Unable to open website`, check URL and internet.
- Pull down to refresh is enabled in the WebView.
- Backend CORS should allow your frontend domain for API calls.
