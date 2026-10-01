import { useRef, useEffect } from "react";
import "./OtpInput.css";

/**
 * Reusable 6-digit OTP input with auto-focus, paste support, and keyboard navigation
 */
export default function OtpInput({ value = "", onChange, disabled = false, autoFocus = true, idPrefix = "otp" }) {
  const inputRefs = useRef([]);

  // Ensure digits array always has 6 items
  const digits = Array(6)
    .fill("")
    .map((_, i) => (value && value[i] ? value[i] : ""));

  useEffect(() => {
    if (autoFocus && inputRefs.current[0] && !disabled) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus, disabled]);

  const handleChange = (e, index) => {
    const rawVal = e.target.value;
    const digit = rawVal.replace(/\D/g, "").slice(-1); // Only take latest numeric digit

    const newDigits = [...digits];
    newDigits[index] = digit;
    const combined = newDigits.join("");
    onChange(combined);

    // Auto-advance to next box if digit was entered
    if (digit && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0 && inputRefs.current[index - 1]) {
        // Move back and clear previous
        inputRefs.current[index - 1].focus();
        const newDigits = [...digits];
        newDigits[index - 1] = "";
        onChange(newDigits.join(""));
      } else {
        const newDigits = [...digits];
        newDigits[index] = "";
        onChange(newDigits.join(""));
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1].focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      e.preventDefault();
      inputRefs.current[index + 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pastedData) return;

    onChange(pastedData);

    // Focus on the next empty box or the last box
    const nextIndex = Math.min(pastedData.length, 5);
    if (inputRefs.current[nextIndex]) {
      inputRefs.current[nextIndex].focus();
    }
  };

  return (
    <div className="otp-input-group" onPaste={handlePaste} role="group" aria-label="6-digit verification code">
      {digits.map((digit, index) => (
        <input
          key={index}
          id={`${idPrefix}-digit-${index}`}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          className={`otp-digit-box ${digit ? "filled" : ""}`}
          aria-label={`Digit ${index + 1} of 6`}
          autoComplete="one-time-code"
        />
      ))}
    </div>
  );
}
