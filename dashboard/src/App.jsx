import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Container from "./Container";


export default function App() {
  return (
    <>
      <main style={{ padding: 24 }}>
        <Navbar />

        <h1>Satellite Health Dashboard</h1>

        <Container title="Telemetry">
          <p>Live stream coming soon…</p>
        </Container>

        <Container title="Battery Status" icon="🔋">
          <strong>Voltage:</strong> 3.98 V
        </Container>
      </main>
    </>
  );
}