import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Container from "./components/Container";
import Login from "./pages/Login";
import { Routes, Route, Navigate } from "react-router-dom";

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<div style={{ padding: 24 }}>Dashboard home</div>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}