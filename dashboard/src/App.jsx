import { useEffect, useState } from "react";

export default function App() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetch("/api/health/")
      .then(res => res.json())
      .then(setHealth)
      .catch(console.error);
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1>Satellite Health Dashboard</h1>
      <pre>{JSON.stringify(health, null, 2)}</pre>
    </main>
  );
}