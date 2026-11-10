import { useEffect, useRef, useState } from "react";
import { dayToInput, parseDayInput } from "../domain/dates";
import { Icon } from "./components";
import { useApp } from "./context";

/**
 * Hidden native date input used only for its calendar popup. Typing happens
 * in our own field, because native date inputs use the browser's language
 * (e.g. MM/DD/YYYY) regardless of the app's language.
 */
const usePicker = (value: string, max: string | undefined, onPick: (day: string) => void) => {
  const ref = useRef<HTMLInputElement>(null);
  const open = () => {
    const input = ref.current;
    if (!input) return;
    try {
      input.showPicker();
    } catch {
      input.focus();
      input.click();
    }
  };
  const input = (
    <input
      ref={ref}
      type="date"
      className="picker-proxy"
      tabIndex={-1}
      aria-hidden
      value={value}
      max={max}
      onChange={(e) => e.target.value && onPick(e.target.value)}
    />
  );
  return { open, input };
};

/** Text date field in the app's format (TT.MM.JJJJ in German) plus a calendar button. */
export const DateField = ({
  value,
  onChange,
  max,
  label,
}: {
  value: string;
  onChange: (day: string) => void;
  max?: string;
  label: string;
}) => {
  const { t, lang } = useApp();
  const [text, setText] = useState(dayToInput(value, lang));
  const [invalid, setInvalid] = useState(false);
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(dayToInput(value, lang));
  }, [value, lang]);
  const picker = usePicker(value, max, onChange);

  const commit = () => {
    focused.current = false;
    const day = parseDayInput(text, lang);
    if (!day || (max && day > max)) {
      setInvalid(text.trim() !== "");
      setText(dayToInput(value, lang));
      return;
    }
    setInvalid(false);
    setText(dayToInput(day, lang));
    if (day !== value) onChange(day);
  };

  return (
    <span className="date-field">
      <input
        className={`text-input ${invalid ? "invalid" : ""}`}
        inputMode="numeric"
        aria-label={label}
        placeholder={lang === "de" ? "TT.MM.JJJJ" : "MM/DD/YYYY"}
        value={text}
        onFocus={(e) => {
          focused.current = true;
          e.target.select();
        }}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      />
      <button type="button" className="mini-button" onClick={picker.open} aria-label={t("Kalender öffnen", "Open calendar")}>
        <Icon name="calendar" size={18} />
      </button>
      {picker.input}
    </span>
  );
};

/** Tappable date label (e.g. in the workout header) that opens the calendar. */
export const DatePill = ({ value, onChange, children }: { value: string; onChange: (day: string) => void; children: React.ReactNode }) => {
  const picker = usePicker(value, undefined, onChange);
  return (
    <span className="date-pill-wrap">
      <button type="button" className="date-pill" onClick={picker.open}>
        {children}
      </button>
      {picker.input}
    </span>
  );
};
