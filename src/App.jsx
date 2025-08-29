import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEYS = {
  players: "pb_players",
  log: "pb_log",
};

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const roundTo10 = (n) => Math.round((Number(n) || 0) / 10) * 10;
const fmtRM = (n) => `RM${(Number(n) || 0).toLocaleString("en-MY")}`;

function App() {
  // --- State
  const [players, setPlayers] = useState([]);
  const [log, setLog] = useState([]);
  const [newPlayer, setNewPlayer] = useState("");

  // --- Load/Save localStorage
  useEffect(() => {
    const savedPlayers = localStorage.getItem(STORAGE_KEYS.players);
    const savedLog = localStorage.getItem(STORAGE_KEYS.log);
    if (savedPlayers) setPlayers(JSON.parse(savedPlayers));
    if (savedLog) setLog(JSON.parse(savedLog));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.players, JSON.stringify(players));
  }, [players]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.log, JSON.stringify(log));
  }, [log]);

  // --- Derived totals
  const buyInTotalsById = useMemo(() => {
    const m = new Map();
    for (const p of players) m.set(p.id, 0);
    for (const e of log) {
      m.set(e.playerId, (m.get(e.playerId) || 0) + Number(e.amount || 0));
    }
    return m;
  }, [players, log]);

  // --- Player operations
  const addPlayer = () => {
    const name = newPlayer.trim();
    if (!name) return;
    if (players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      alert("Name already exists.");
      return;
    }
    setPlayers((prev) => [
      ...prev,
      { id: uid(), name, finalChips: "", defaultNote: "Cash" },
    ]);
    setNewPlayer("");
  };

  const removePlayer = (id) => {
    if (!confirm("Remove this player?")) return;
    setPlayers((prev) => prev.filter((p) => p.id !== id));
    setLog((prev) => prev.filter((e) => e.playerId !== id));
  };

  const updatePlayer = (id, patch) => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
    );
  };

  // --- Buy-ins
  const addBuyIn = (playerId, amount) => {
    const player = players.find((p) => p.id === playerId);
    if (!player) return;
    const note = player.defaultNote || "";
    setLog((prev) => [
      {
        id: uid(),
        ts: new Date().toISOString(),
        playerId,
        playerName: player.name,
        amount: Number(amount) || 0,
        note,
      },
      ...prev,
    ]);
  };

  const clearSession = () => {
    if (!confirm("This will clear ALL players, logs, and inputs.")) return;
    setPlayers([]);
    setLog([]);
    localStorage.removeItem(STORAGE_KEYS.players);
    localStorage.removeItem(STORAGE_KEYS.log);
  };

  // --- UI
  return (
    <div className="container">
      <header className="vstack" style={{ gap: 4, marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>🃏 Merdeka Poker</h1>
        <div className="badge">
          Banker-only • 1 chip = RM1 • Round to nearest 10
        </div>
      </header>

      {/* Add Players */}
      <section className="card vstack">
        <h2 style={{ margin: 0 }}>Players</h2>
        <div className="hstack">
          <input
            className="input"
            placeholder="Add player name"
            value={newPlayer}
            onChange={(e) => setNewPlayer(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addPlayer()}
          />
          <button className="button" onClick={addPlayer}>
            Add
          </button>
        </div>

        {/* Player List */}
        <div className="vstack" style={{ marginTop: 8 }}>
          {players.length === 0 && (
            <div className="pill">No players yet — add a few to start.</div>
          )}
          {players.map((p) => {
            const buyIns = buyInTotalsById.get(p.id) || 0;
            const rounded = roundTo10(p.finalChips);
            const pnl = rounded - buyIns;
            return (
              <div key={p.id} className="card" style={{ padding: 12 }}>
                <div
                  className="hstack"
                  style={{ justifyContent: "space-between" }}
                >
                  <strong>{p.name}</strong>
                  <button
                    className="button ghost"
                    onClick={() => removePlayer(p.id)}
                  >
                    Remove
                  </button>
                </div>

                {/* Quick Buy-ins */}
                <div
                  className="hstack"
                  style={{ flexWrap: "wrap", marginTop: 8 }}
                >
                  {[50, 100, 200].map((amt) => (
                    <button
                      key={amt}
                      className="button secondary"
                      onClick={() => addBuyIn(p.id, amt)}
                    >
                      +{amt}
                    </button>
                  ))}
                  <CustomBuyIn onAdd={(val) => addBuyIn(p.id, val)} />
                  <div className="hstack" style={{ marginLeft: "auto" }}>
                    <span className="badge">Default note:</span>
                    <select
                      className="select"
                      value={p.defaultNote}
                      onChange={(e) =>
                        updatePlayer(p.id, { defaultNote: e.target.value })
                      }
                    >
                      <option>Cash</option>
                      <option>Transfer</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>

                {/* Final chips input */}
                <div className="hstack" style={{ marginTop: 8, gap: 12 }}>
                  <label style={{ width: 120 }}>Final Chips</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    placeholder="e.g. 350"
                    value={p.finalChips}
                    onChange={(e) =>
                      updatePlayer(p.id, { finalChips: e.target.value })
                    }
                    inputMode="numeric"
                  />
                </div>

                {/* Per-player summary */}
                <div className="hstack" style={{ marginTop: 8, gap: 16 }}>
                  <div className="pill">Buy-ins: {fmtRM(buyIns)}</div>
                  <div className="pill">Rounded chips: {rounded}</div>
                  <div className="pill">
                    P/L:{" "}
                    <span className={pnl >= 0 ? "text-green" : "text-red"}>
                      {pnl >= 0 ? "+" : ""}
                      {fmtRM(pnl)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Session Controls */}
        <div
          className="hstack"
          style={{ marginTop: 8, justifyContent: "space-between" }}
        >
          <button className="button ghost" onClick={clearSession}>
            Clear Session
          </button>
          <div className="hstack" style={{ gap: 6 }}>
            <span className="kbd">Tip:</span>
            <span>
              Tap +50/+100/+200 during play. Enter final chips at the end.
            </span>
          </div>
        </div>
      </section>

      {/* Summary Table */}
      <section className="card vstack" style={{ marginTop: 16 }}>
        <h2 style={{ margin: 0 }}>Summary (static leaderboard)</h2>
        <table className="table" style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th>Player</th>
              <th>Total Buy-ins</th>
              <th>Final Chips</th>
              <th>Rounded</th>
              <th>P/L</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => {
              const buyIns = buyInTotalsById.get(p.id) || 0;
              const rounded = roundTo10(p.finalChips);
              const pnl = rounded - buyIns;
              return (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{fmtRM(buyIns)}</td>
                  <td>{p.finalChips || 0}</td>
                  <td>{rounded}</td>
                  <td className={pnl >= 0 ? "text-green" : "text-red"}>
                    {pnl >= 0 ? "+" : ""}
                    {fmtRM(pnl)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="footer">
          Manually sort this table at the end if you want to rank.
        </div>
      </section>

      {/* Game Log */}
      <section className="card vstack" style={{ marginTop: 16 }}>
        <h2 style={{ margin: 0 }}>Game Log</h2>
        <div className="hr"></div>
        {log.length === 0 && <div className="pill">No buy-ins yet.</div>}
        <ul
          style={{ listStyle: "none", padding: 0, margin: 0 }}
          className="vstack"
        >
          {log.map((e) => (
            <li
              key={e.id}
              className="hstack"
              style={{ justifyContent: "space-between" }}
            >
              <div>
                <strong>{e.playerName}</strong> bought in {fmtRM(e.amount)}
                {e.note ? ` (${e.note})` : ""}
              </div>
              <small style={{ opacity: 0.7 }}>
                {new Date(e.ts).toLocaleString()}
              </small>
            </li>
          ))}
        </ul>
      </section>

      <div className="footer">© {new Date().getFullYear()} Merdeka Poker</div>
    </div>
  );
}

function CustomBuyIn({ onAdd }) {
  const [val, setVal] = useState("");
  return (
    <div className="hstack">
      <input
        className="input"
        style={{ width: 110 }}
        type="number"
        min="0"
        placeholder="Custom"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        inputMode="numeric"
      />
      <button
        className="button secondary"
        onClick={() => {
          if (!val) return;
          onAdd(Number(val));
          setVal("");
        }}
      >
        +Add
      </button>
    </div>
  );
}

export default App;
