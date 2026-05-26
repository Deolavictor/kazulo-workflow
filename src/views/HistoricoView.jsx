import React, { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";

function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function eventIcon(type) {
  if (type === "create") return "+";
  if (type === "advance") return "→";
  if (type === "check") return "✓";
  if (type === "progress") return "●";
  return "✎";
}

export function HistoricoView({ projects, onOpenProject }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [projectId, setProjectId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { events: list } = await api.fetchHistory({
        limit: 500,
        q: q.trim() || undefined,
        projectId: projectId || undefined
      });
      setEvents(list);
    } catch (err) {
      alert(err.message || "Erro ao carregar histórico");
    } finally {
      setLoading(false);
    }
  }, [q, projectId]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const activeProjects = projects
    .filter((p) => !p.completed)
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));

  return (
    <div className="admin-page historico-page">
      <div className="admin-page-header">
        <h2>Histórico geral</h2>
        <p>Todas as movimentações registradas nos projetos, mais recentes primeiro</p>
      </div>

      <div className="historico-filters">
        <input
          className="search-input"
          placeholder="Buscar por mensagem, usuário, projeto…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="filter-select"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
        >
          <option value="">Todos os projetos</option>
          {activeProjects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {p.client}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="board-loading">Carregando histórico…</div>
      ) : events.length === 0 ? (
        <p className="admin-hint">Nenhum evento encontrado.</p>
      ) : (
        <div className="historico-timeline-wrap">
          <div className="timeline historico-timeline">
            {events.map((ev) => (
              <div key={`${ev.projectId}-${ev.id}`} className="timeline-item">
                <div className={`timeline-dot ${ev.type || "edit"}`}>
                  {eventIcon(ev.type)}
                </div>
                <div className="timeline-content">
                  <div className="historico-project-line">
                    <button
                      type="button"
                      className="historico-project-link"
                      onClick={() => {
                        const p = projects.find((x) => x.id === ev.projectId);
                        if (p) onOpenProject(p);
                      }}
                    >
                      {ev.projectName}
                    </button>
                    {ev.client && (
                      <span className="historico-client">{ev.client}</span>
                    )}
                  </div>
                  <div className="time">{formatDateTime(ev.at)}</div>
                  <div className="msg">{ev.message}</div>
                  <div className="user">{ev.user}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
