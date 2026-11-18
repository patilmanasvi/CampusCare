// src/pages/SelectPC.jsx
import React, { useEffect, useState } from "react";
import { mockPcService } from "../mock/pcService";
import Card from "../components/common/Card";
import LoadingSpinner from "../components/common/LoadingSpinner";

export default function SelectPC() {
  const [blocks, setBlocks] = useState([]);
  const [labs, setLabs] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [pcs, setPcs] = useState([]);
  const [selectedBlock, setSelectedBlock] = useState("");
  const [selectedLab, setSelectedLab] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [selectedPc, setSelectedPc] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load blocks on mount
  useEffect(() => {
    async function fetchBlocks() {
      const data = await mockPcService.getBlocks();
      setBlocks(data);
    }
    fetchBlocks();
  }, []);

  // When block changes, load labs
  useEffect(() => {
    if (!selectedBlock) return;
    async function fetchLabs() {
      const data = await mockPcService.getLabs(selectedBlock);
      setLabs(data);
      setSelectedLab("");
      setRooms([]);
      setPcs([]);
    }
    fetchLabs();
  }, [selectedBlock]);

  // When lab changes, load rooms
  useEffect(() => {
    if (!selectedLab) return;
    async function fetchRooms() {
      const data = await mockPcService.getRooms(selectedLab);
      setRooms(data);
      setSelectedRoom("");
      setPcs([]);
    }
    fetchRooms();
  }, [selectedLab]);

  // When room changes, load PCs
  useEffect(() => {
    if (!selectedRoom) return;
    async function fetchPcs() {
      setLoading(true);
      const data = await mockPcService.getPcs(selectedRoom);
      setPcs(data);
      setLoading(false);
    }
    fetchPcs();
  }, [selectedRoom]);

  const handlePcSelect = (pc) => {
    setSelectedPc(pc);
  };

  return (
    <section className="p-4 text-gray-900 dark:text-white">
      <h2 className="text-2xl font-semibold mb-4">Select PC Manually</h2>

      <div className="grid gap-4 max-w-lg">
        {/* Block selection */}
        <select
          value={selectedBlock}
          onChange={(e) => setSelectedBlock(e.target.value)}
          className="rounded border p-2 border-gray-300 bg-white text-gray-900 placeholder-gray-400 dark:border-gray-600 dark:bg-dark-bg dark:text-white dark:placeholder-gray-500"
        >
          <option value="">-- Select Block --</option>
          {blocks.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        {/* Lab selection */}
        {labs.length > 0 && (
          <select
            value={selectedLab}
            onChange={(e) => setSelectedLab(e.target.value)}
            className="rounded border p-2 border-gray-300 bg-white text-gray-900 placeholder-gray-400 dark:border-gray-600 dark:bg-dark-bg dark:text-white dark:placeholder-gray-500"
          >
            <option value="">-- Select Lab --</option>
            {labs.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        )}

        {/* Room selection */}
        {rooms.length > 0 && (
          <select
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
            className="rounded border p-2 border-gray-300 bg-white text-gray-900 placeholder-gray-400 dark:border-gray-600 dark:bg-dark-bg dark:text-white dark:placeholder-gray-500"
          >
            <option value="">-- Select Room --</option>
            {rooms.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        )}

        {/* PC selection */}
        {pcs.length > 0 && (
          <div>
            <p className="mb-2 font-medium">Select PC:</p>
            <ul className="space-y-2">
              {pcs.map((pc) => (
                <li key={pc.id}>
                  <button
                    onClick={() => handlePcSelect(pc)}
                    className={`w-full text-left rounded p-2 border ${selectedPc?.id === pc.id ? "bg-primary text-white" : "bg-white text-gray-900 border-gray-300 dark:bg-dark-surface dark:text-white dark:border-gray-600"}`}
                  >
                    {pc.displayCode} (PC #{pc.pcNumber})
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {loading && <LoadingSpinner />}

      {selectedPc && (
        <Card className="mt-4">
          <h3 className="font-medium text-lg mb-2">PC Details</h3>
          <p><strong>Block:</strong> {selectedPc.block || selectedBlock}</p>
          <p><strong>Lab:</strong> {selectedPc.lab || selectedLab}</p>
          <p><strong>Room:</strong> {selectedPc.room || selectedRoom}</p>
          <p><strong>PC Number:</strong> {selectedPc.pcNumber}</p>
          <p><strong>Display Code:</strong> {selectedPc.displayCode}</p>
        </Card>
      )}
    </section>
  );
}