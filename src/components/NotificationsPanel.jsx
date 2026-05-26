import React, { useEffect, useRef } from "react";

const TYPE_LABELS = {
  overdue: "Atraso",
  production_blocker: "Produção",
  delivery_risk: "Entrega"
};

export function NotificationsPanel({
  open,
  onClose,
  notifications,
  unreadCount,
  loading,
  onMarkAllRead,
  onOpenNotification
}) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        const btn = document.querySelector(".notif-btn");
        if (btn?.contains(e.target)) return;
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="notif-panel" ref={panelRef} role="dialog" aria-label="Notificações">
      <div className="notif-panel-header">
        <h3>Notificações</h3>
        {unreadCount > 0 && (
          <button type="button" className="notif-mark-all" onClick={onMarkAllRead}>
            Marcar todas como lidas
          </button>
        )}
      </div>
      <div className="notif-panel-body">
        {loading ? (
          <p className="notif-empty">Carregando…</p>
        ) : notifications.length === 0 ? (
          <p className="notif-empty">Nenhum alerta no momento.</p>
        ) : (
          <ul className="notif-list">
            {notifications.map((n) => (
              <li key={n.id} className={n.read ? "read" : "unread"}>
                <button
                  type="button"
                  className="notif-item"
                  onClick={() => onOpenNotification(n)}
                >
                  <span className={`notif-type notif-type--${n.type}`}>
                    {TYPE_LABELS[n.type] || "Alerta"}
                  </span>
                  <span className="notif-msg">{n.message}</span>
                  <span className="notif-meta">
                    {n.projectName}
                    {n.sector ? ` · ${n.sector}` : ""}
                    {n.daysLate != null ? ` · ${n.daysLate}d` : ""}
                    {n.daysUntilDelivery != null && n.daysUntilDelivery >= 0
                      ? ` · entrega ${n.dueLabel || ""}`
                      : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
