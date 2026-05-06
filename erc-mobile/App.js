import React, { useMemo, useState } from "react";
import { SafeAreaView, View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import Constants from "expo-constants";
import { WebView } from "react-native-webview";

export default function App() {
  const [hasError, setHasError] = useState(false);

  const appUrl = useMemo(() => {
    const envUrl = process.env.EXPO_PUBLIC_WEB_APP_URL;
    if (envUrl) return envUrl;

    const expoUrl = Constants.expoConfig?.extra?.webAppUrl;
    if (expoUrl) return expoUrl;

    return "https://example.com";
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      {hasError ? (
        <View style={styles.center}>
          <Text style={styles.title}>Unable to open website</Text>
          <Text style={styles.subtitle}>Check URL or network, then reload.</Text>
          <Pressable style={styles.button} onPress={() => setHasError(false)}>
            <Text style={styles.buttonText}>Try Again</Text>
          </Pressable>
          <Text style={styles.urlText}>{appUrl}</Text>
        </View>
      ) : (
        <WebView
          source={{ uri: appUrl }}
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          pullToRefreshEnabled
          startInLoadingState
          onError={() => setHasError(true)}
          renderLoading={() => (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#166534" />
              <Text style={styles.subtitle}>Loading ERC...</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff"
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8
  },
  subtitle: {
    fontSize: 14,
    color: "#4b5563",
    marginBottom: 14,
    textAlign: "center"
  },
  button: {
    borderRadius: 10,
    backgroundColor: "#166534",
    paddingVertical: 10,
    paddingHorizontal: 20
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600"
  },
  urlText: {
    marginTop: 16,
    color: "#6b7280",
    fontSize: 12,
    textAlign: "center"
  }
});
