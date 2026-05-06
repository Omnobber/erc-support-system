import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState("admin@erc.local");
  const [password, setPassword] = useState("Admin@123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const sessionMessage = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const reason = params.get("reason");
    if (reason === "session-expired") {
      return "Your session expired. Please sign in again.";
    }
    if (reason === "missing-token") {
      return "Please sign in to continue.";
    }
    return "";
  }, [location.search]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === "admin") navigate("/admin");
      else if (user.role === "engineer") navigate("/engineer");
      else navigate("/client");
    } catch (err) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError(
          "Cannot reach backend API. Start backend server and MongoDB, then try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-[linear-gradient(120deg,#f3f7fb_0%,#e8f4ee_55%,#fff4dd_100%)] px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-3xl border border-white/70 bg-white/90 p-7 shadow-panel backdrop-blur"
      >
        <h1 className="font-heading text-3xl font-semibold text-slate-900">ERC Login Portal</h1>
        <p className="mt-1 text-sm text-slate-500">Admin / Engineer / Client</p>
        <p className="mt-1 text-xs text-slate-400">Use seeded users from README for quick access.</p>
        {sessionMessage && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">{sessionMessage}</p>
        )}
        <div className="mt-6 space-y-4">
          <label className="block text-sm font-semibold text-slate-700">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none ring-brand-500 focus:ring"
              required
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none ring-brand-500 focus:ring"
              required
            />
          </label>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand-500 px-4 py-2.5 font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoginPage;
