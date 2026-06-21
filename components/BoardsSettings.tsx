"use client";

import { useEffect, useState } from "react";

type Board = { id: string; label: string; enabled: boolean; displayOrder: number };

export default function BoardsSettings({ password }: { password: string }) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/boards")
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setBoards(data))
      .catch(() => {});
  }, []);

  const toggle = async (board: Board) => {
    setSavingId(board.id);
    const next = !board.enabled;
    try {
      const res = await fetch("/api/boards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: board.id, enabled: next, passwordHash: password }),
      });
      if (res.ok) {
        setBoards((cur) => cur.map((b) => (b.id === board.id ? { ...b, enabled: next } : b)));
      }
    } finally {
      setSavingId(null);
    }
  };

  if (boards.length === 0) return null;

  return (
    <div className="border rounded-lg p-4 mb-6">
      <h2 className="font-semibold text-lg mb-3">Boards</h2>
      <div className="flex flex-col gap-2">
        {boards.map((b) => (
          <label key={b.id} className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium">{b.label}</span>
            <button
              type="button"
              disabled={savingId === b.id}
              onClick={() => toggle(b)}
              aria-pressed={b.enabled}
              className={`px-3 py-1 rounded text-xs font-semibold border ${
                b.enabled
                  ? "bg-green-100 text-green-800 border-green-300"
                  : "bg-gray-100 text-gray-600 border-gray-300"
              }`}
            >
              {b.enabled ? "Visible" : "Hidden"}
            </button>
          </label>
        ))}
      </div>
    </div>
  );
}
