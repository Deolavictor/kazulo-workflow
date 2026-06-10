import React, { useEffect, useId, useRef, useState } from "react";
import { brToIso, isoToBr, maskBrDateInput } from "../utils/dateBr";
import { adjustToPreviousBusinessDay } from "../utils/businessDays";

/**
 * Campo de data em pt-BR (dd/mm/aaaa) com máscara + calendário nativo opcional.
 * value/onChange usam ISO yyyy-mm-dd (compatível com o restante do app).
 */
export function DateField({
  value = "",
  onChange,
  disabled = false,
  className = "",
  inputClassName = "",
  compact = false,
  placeholder = "dd/mm/aaaa",
  snapToBusinessDay = true,
  "aria-label": ariaLabel,
  id: idProp
}) {
  const autoId = useId();
  const id = idProp || autoId;
  const nativeRef = useRef(null);
  const [text, setText] = useState(() => isoToBr(value));
  const [invalid, setInvalid] = useState(false);
  const [adjustedHint, setAdjustedHint] = useState(false);

  useEffect(() => {
    setText(isoToBr(value));
    setInvalid(false);
    setAdjustedHint(false);
  }, [value]);

  function normalizeIso(iso) {
    if (!iso || !snapToBusinessDay) return iso || "";
    return adjustToPreviousBusinessDay(iso);
  }

  function emitChange(iso) {
    const normalized = normalizeIso(iso);
    setAdjustedHint(Boolean(iso && normalized && iso !== normalized));
    if (normalized) {
      setText(isoToBr(normalized));
    }
    onChange?.(normalized || "");
  }

  function handleTextChange(e) {
    const masked = maskBrDateInput(e.target.value);
    setText(masked);
    setInvalid(false);

    if (masked.length === 10) {
      const iso = brToIso(masked);
      if (iso) {
        emitChange(iso);
        return;
      }
      setInvalid(true);
    } else if (!masked) {
      emitChange("");
    }
  }

  function handleBlur() {
    if (!text.trim()) {
      setInvalid(false);
      emitChange("");
      return;
    }
    const iso = brToIso(text);
    if (!iso) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setText(isoToBr(iso));
    emitChange(iso);
  }

  function handleNativeChange(e) {
    const iso = e.target.value;
    if (!iso) {
      setText("");
      setInvalid(false);
      emitChange("");
      return;
    }
    setText(isoToBr(iso));
    setInvalid(false);
    emitChange(iso);
  }

  function openCalendar() {
    const el = nativeRef.current;
    if (!el) return;
    try {
      if (typeof el.showPicker === "function") {
        el.showPicker();
      } else {
        el.click();
      }
    } catch {
      el.click();
    }
  }

  return (
    <div
      className={`date-field ${compact ? "date-field--compact" : ""} ${invalid ? "date-field--invalid" : ""} ${className}`.trim()}
    >
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className={`date-field-input ${inputClassName}`.trim()}
        placeholder={placeholder}
        value={text}
        disabled={disabled}
        maxLength={10}
        aria-label={ariaLabel || "Data no formato dia, mês e ano"}
        aria-invalid={invalid || undefined}
        onChange={handleTextChange}
        onBlur={handleBlur}
      />
      {!disabled && (
        <>
          <input
            ref={nativeRef}
            type="date"
            className="date-field-native"
            value={value || ""}
            tabIndex={-1}
            aria-hidden="true"
            onChange={handleNativeChange}
          />
          <button
            type="button"
            className="date-field-calendar-btn"
            onClick={openCalendar}
            title="Abrir calendário"
            aria-label="Abrir calendário"
          >
            <span aria-hidden="true">📅</span>
          </button>
        </>
      )}
      {invalid && !compact && (
        <span className="date-field-error">Use o formato dd/mm/aaaa</span>
      )}
      {adjustedHint && !invalid && !compact && (
        <span className="date-field-hint">Ajustado para o dia útil anterior (fim de semana/feriado)</span>
      )}
    </div>
  );
}
