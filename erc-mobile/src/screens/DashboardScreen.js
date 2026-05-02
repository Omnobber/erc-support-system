import { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  RefreshControl
} from "react-native";
import api from "../api/api";

export default function DashboardScreen({ route }) {
  const { token } = route.params;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      setError("");
      const res = await api.get("/dashboard/summary", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("✅ DATA:", res.data);
      setData(res.data);
    } catch (err) {
      console.log("❌ ERROR:", err.response?.data || err.message);
      setError("Failed to load dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // 🔄 Loading State
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2e7d32" />
        <Text style={{ marginTop: 10 }}>Loading Dashboard...</Text>
      </View>
    );
  }

  // ❌ Error State
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "red" }}>{error}</Text>
      </View>
    );
  }

  // 🎯 Main UI
  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.header}>📊 Dashboard</Text>

      <View style={styles.card}>
        <Text style={styles.title}>Total Calls</Text>
        <Text style={styles.value}>{data.totalCalls}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Total Cameras</Text>
        <Text style={styles.value}>{data.totalCameras}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Pending Calls</Text>
        <Text style={styles.value}>{data.pendingCalls}</Text>
      </View>

    </ScrollView>
  );
}

// 🎨 Styles
const styles = {
  container: {
    flex: 1,
    backgroundColor: "#f4f6f8",
    padding: 15,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#1b5e20",
  },

  card: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 4, // Android shadow
  },

  title: {
    fontSize: 16,
    color: "#777",
  },

  value: {
    fontSize: 30,
    fontWeight: "bold",
    marginTop: 5,
    color: "#000",
  },
};