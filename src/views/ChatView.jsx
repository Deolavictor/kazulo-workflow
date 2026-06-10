import React, { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../api/client";

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ChatView({
  user,
  readOnly = false,
  initialChannel = "geral",
  onRead,
  onMessagesLoaded
}) {
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(initialChannel);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  const loadChannels = useCallback(async () => {
    try {
      const { channels: list } = await api.fetchChatChannels();
      setChannels(list);
    } catch {
      /* ignore */
    }
  }, []);

  const loadMessages = useCallback(async () => {
    try {
      const { messages: list } = await api.fetchChatMessages(activeChannel, { limit: 150 });
      setMessages(list);
      if (list.length > 0) {
        const lastId = list[list.length - 1].id;
        await api.markChatRead(activeChannel, lastId);
        onRead?.();
      }
      onMessagesLoaded?.();
    } catch (err) {
      console.warn("[chat]", err.message);
    } finally {
      setLoading(false);
    }
  }, [activeChannel, onRead, onMessagesLoaded]);

  useEffect(() => {
    setActiveChannel(initialChannel);
  }, [initialChannel]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  useEffect(() => {
    setLoading(true);
    loadMessages();
    const t = setInterval(loadMessages, 4000);
    return () => clearInterval(t);
  }, [loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeChannel]);

  async function handleSend(e) {
    e.preventDefault();
    if (readOnly) return;
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await api.sendChatMessage(activeChannel, body);
      setText("");
      await loadMessages();
      await loadChannels();
    } catch (err) {
      alert(err.message || "Não foi possível enviar");
    } finally {
      setSending(false);
    }
  }

  const activeMeta = channels.find((c) => c.id === activeChannel);

  return (
    <div className="chat-view">
      <div className="chat-view-header">
        <h2>Chat</h2>
        <p>Conversa entre setores — Design, Processos, PCP, Compras e mais</p>
      </div>
      <div className="chat-layout">
        <aside className="chat-channels">
          <p className="chat-channels-title">Canais</p>
          {channels.map((ch) => (
            <button
              key={ch.id}
              type="button"
              className={`chat-channel-btn ${activeChannel === ch.id ? "active" : ""}`}
              onClick={() => setActiveChannel(ch.id)}
            >
              <span className="chat-channel-label">{ch.label}</span>
              {ch.unread > 0 && (
                <span className="chat-channel-badge">{ch.unread}</span>
              )}
            </button>
          ))}
        </aside>
        <div className="chat-main">
          <div className="chat-main-head">
            <strong>{activeMeta?.label || activeChannel}</strong>
            <span className="chat-main-desc">{activeMeta?.description}</span>
          </div>
          <div className="chat-messages">
            {loading && messages.length === 0 ? (
              <p className="chat-empty">Carregando mensagens…</p>
            ) : messages.length === 0 ? (
              <p className="chat-empty">Nenhuma mensagem ainda. Inicie a conversa.</p>
            ) : (
              messages.map((m) => {
                const mine = m.userId === user?.id;
                return (
                  <div
                    key={m.id}
                    className={`chat-bubble-row ${mine ? "mine" : "theirs"}`}
                  >
                    <div className={`chat-bubble ${mine ? "mine" : "theirs"}`}>
                      <div className="chat-bubble-head">
                        <span className="chat-author">{m.userName}</span>
                        {m.userSector && (
                          <span className="chat-sector">{m.userSector}</span>
                        )}
                        <span className="chat-time">{formatTime(m.createdAt)}</span>
                      </div>
                      <p className="chat-body">{m.body}</p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>
          {readOnly ? (
            <p className="chat-readonly-hint">
              Modo visualização — leitura do chat apenas, sem envio de mensagens.
            </p>
          ) : (
            <form className="chat-compose" onSubmit={handleSend}>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`Mensagem em ${activeMeta?.label || "canal"}…`}
                maxLength={2000}
                autoComplete="off"
              />
              <button type="submit" className="btn-primary" disabled={sending || !text.trim()}>
                {sending ? "…" : "Enviar"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
