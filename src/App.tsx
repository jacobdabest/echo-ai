import { useAuth } from "./hooks/useAuth";
import Auth from "./components/Auth";
import Dashboard from "./components/Dashboard";

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "var(--bg-primary)",
          color: "var(--text-muted)",
          fontFamily: "var(--font-mono)",
          fontSize: 14,
        }}
      >
        Initializing ECHO systems...
      </div>
    );
  }

  return user ? <Dashboard /> : <Auth />;
}

export default App;
