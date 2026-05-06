import { useState } from "react";
import { View, Text, TextInput, Button } from "react-native";
import api from "../api/api";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("admin@erc.local");
  const [password, setPassword] = useState("Admin@123");

  const login = async () => {
    try {
      const res = await api.post("/auth/login", { email, password });
      navigation.navigate("Dashboard", {
        token: res.data.token,
      });
    } catch (_err) {
      alert("Login failed");
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>Email</Text>
      <TextInput value={email} onChangeText={setEmail} />

      <Text>Password</Text>
      <TextInput value={password} onChangeText={setPassword} secureTextEntry />

      <Button title="Login" onPress={login} />
    </View>
  );
}
