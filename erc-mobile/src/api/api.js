import axios from "axios";

const api = axios.create({
  baseURL: "http://192.168.31.58:5000/api", // ✅ FIXED
  timeout: 5000
});

export default api;