// src/pages/ScanQR.jsx
import React, { useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { mockPcService } from "../mock/pcService";
import LoadingSpinner from "../components/common/LoadingSpinner";
import Card from "../components/common/Card";

export default function ScanQR() {
  const [token, setToken] = useState("");
  const [pc, setPc] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [addedPcs, setAddedPcs] = useState([]);

  // Decode result from QR scanner
  const handleDecode = async (result) => {
    const scanned = (result?.text ?? result)?.trim();
    if (!scanned) return;
    setToken(scanned);
    await fetchPc(scanned);
  };

  // Scanner error handling
  const handleError = (err) => {
    setCameraError(err?.message || "Camera error");
  };

  const fetchPc = async (scannedToken) => {
    setLoading(true);
    setError("");
    setPc(null);
    try {
      const data = await mockPcService.lookupByToken(scannedToken);
      setPc(data);
      setAddedPcs(prev => [...prev, data]);
    } catch (e) {
      setError("Failed to fetch PC information.");
    } finally {
      setLoading(false);
    }
  };

  // Manual token submission (fallback when camera not available)
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;
    await fetchPc(token.trim());
    setToken('');
  };

  return ( <> 
    <section className="p-4 max-w-2xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Scan PC QR Code</h2>

      {cameraError && <p className="text-red-600 mb-2">{cameraError}</p>}

      {/* QR Scanner */}
      <div className="mb-4">
        <Scanner
          onDecode={handleDecode}
          onError={handleError}
          constraints={{ facingMode: "environment" }}
          style={{ width: "100%", maxHeight: "300px" }}
        />
      </div>

      {/* Manual entry fallback */}
      <form onSubmit={handleManualSubmit} className="flex gap-2 items-center mb-4">
        <input
          type="text"
          placeholder="Enter QR token manually"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="flex-1 rounded border p-2"
        />
        <button
          type="submit"
          className="rounded bg-primary px-4 py-2 text-white hover:bg-primary-dark"
        >
          Lookup
        </button>
      </form>

      {loading && <LoadingSpinner />}

      {error && <p className="text-red-600 mt-2">{error}</p>}

      {pc && (
        <Card className="mt-4">
          <h3 className="font-medium text-lg mb-2">PC Details</h3>
          <p><strong>Block:</strong> {pc.block}</p>
          <p><strong>Lab:</strong> {pc.lab}</p>
          <p><strong>Room:</strong> {pc.room}</p>
          <p><strong>PC Number:</strong> {pc.pcNumber}</p>
          <p><strong>Display Code:</strong> {pc.displayCode}</p>
          <p><strong>Status:</strong> {pc.status}</p>
        </Card>
      )}
    </section>

{addedPcs.length > 0 && (
  <div className="mt-8">
    <h3 className="font-medium text-lg mb-2">Added PCs</h3>
    {addedPcs.map((item, idx) => (
      <Card key={idx} className="mb-4">
        <p><strong>Block:</strong> {item.block}</p>
        <p><strong>Lab:</strong> {item.lab}</p>
        <p><strong>Room:</strong> {item.room}</p>
        <p><strong>PC Number:</strong> {item.pcNumber}</p>
        <p><strong>Display Code:</strong> {item.displayCode}</p>
        <p><strong>Status:</strong> {item.status}</p>
      </Card>
    ))}
  </div>
)}
  </> );
}
