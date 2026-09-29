import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { AppLayout } from "../layouts/AppLayout";
import { EMERGENCY_TYPES } from "../data/demoData";

const INITIAL_FORM = {
  type: "",
  description: "",
  lat: "",
  lng: "",
  locationStatus: "",
  additionalInfo: "",
};

export default function ReportEmergency() {
  const navigate = useNavigate();

  const { addEmergency } = useApp();

  const [form, setForm] = useState(INITIAL_FORM);

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  const [errors, setErrors] = useState({});

  const fileInputRef = useRef();

  // =====================================================
  // Update form field
  // =====================================================

  const setField = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));

    if (errors[key]) {
      setErrors((prev) => ({
        ...prev,
        [key]: "",
      }));
    }
  };

  // =====================================================
  // Get GPS location
  // =====================================================

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setField("locationStatus", "error");
      return;
    }

    setLocationLoading(true);
    setField("locationStatus", "detecting");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
          locationStatus: "detected",
        }));

        setLocationLoading(false);
      },
      () => {
        setField("locationStatus", "error");
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // =====================================================
  // Image upload
  // =====================================================

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    // Maximum 10 MB
    if (file.size > 10 * 1024 * 1024) {
      setErrors({
        submit: "Image must be smaller than 10 MB.",
      });

      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrors({
        submit: "Please select a valid image file.",
      });

      return;
    }

    setImageFile(file);

    const reader = new FileReader();

    reader.onload = (ev) => {
      setImagePreview(ev.target.result);
    };

    reader.readAsDataURL(file);
  };

  // =====================================================
  // Validate form
  // =====================================================

  const validate = () => {
    const errs = {};

    if (!form.type) {
      errs.type = "Please select an emergency type.";
    }

    if (!form.description.trim()) {
      errs.description =
        "Please describe the emergency.";
    } else if (form.description.trim().length < 10) {
      errs.description =
        "Please provide more detail (at least 10 characters).";
    }

    return errs;
  };

  // =====================================================
  // Submit emergency
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validate();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const emergencyType =
        EMERGENCY_TYPES.find(
          (t) => t.value === form.type
        )?.label || form.type;

      // Combine additional information with description
      // because the current backend schema stores description
      // as the main emergency text.
      let description = form.description.trim();

      if (form.additionalInfo.trim()) {
        description +=
          `\n\nAdditional Information: ${form.additionalInfo.trim()}`;
      }

      // No fake/default Delhi coordinates.
      // If location wasn't detected, the backend receives null.
      const latitude = form.lat
        ? parseFloat(form.lat)
        : null;

      const longitude = form.lng
        ? parseFloat(form.lng)
        : null;

      // Send emergency ONCE through AppContext.
      const result = await addEmergency({
        type: emergencyType,
        description,
        latitude,
        longitude,
        locationText:
          form.lat && form.lng
            ? `Lat: ${form.lat}, Lng: ${form.lng}`
            : "Location not detected",
      });

      if (!result?.success) {
        setErrors({
          submit:
            result?.error ||
            "Unable to submit emergency. Please try again.",
        });

        return;
      }

      // Emergency has now been saved in PostgreSQL.
      // AppContext also stores it as submittedEmergency.
      navigate("/citizen/confirmation");
    } catch (error) {
      console.error(
        "Emergency submission error:",
        error
      );

      setErrors({
        submit:
          "Unable to submit emergency. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout
      title="Report Emergency"
      subtitle="Submit a new emergency report"
    >
      <div className="row justify-content-center">
        <div className="col-lg-7 col-xl-6">

          {/* Header */}
          <div className="page-header">
            <h1
              className="page-title"
              style={{ color: "#dc2626" }}
            >
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              Report Emergency
            </h1>

            <p className="page-subtitle">
              Fill in the details below. Professional
              responders will be notified after AI analysis.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate>

            {/* Emergency Type */}
            <div className="section-card mb-4">
              <div className="section-card-header">
                <h2 className="section-card-title">
                  <i className="bi bi-tag-fill text-danger"></i>
                  Emergency Type
                </h2>
              </div>

              <div className="section-card-body">
                <div className="row g-2">

                  {EMERGENCY_TYPES.map((t) => (
                    <div
                      key={t.value}
                      className="col-6"
                    >
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          border: `2px solid ${
                            form.type === t.value
                              ? t.color
                              : "#e2e8f0"
                          }`,
                          borderRadius: 10,
                          padding: "12px 14px",
                          cursor: "pointer",
                          transition: "all 0.15s",
                          background:
                            form.type === t.value
                              ? t.color + "10"
                              : "#fff",
                        }}
                      >
                        <input
                          type="radio"
                          name="emergencyType"
                          value={t.value}
                          checked={
                            form.type === t.value
                          }
                          onChange={() =>
                            setField(
                              "type",
                              t.value
                            )
                          }
                          className="visually-hidden"
                        />

                        <i
                          className={`bi ${t.icon}`}
                          style={{
                            fontSize: 20,
                            color: t.color,
                          }}
                        ></i>

                        <span
                          style={{
                            fontSize: 13.5,
                            fontWeight: 600,
                            color: "#1e293b",
                          }}
                        >
                          {t.label}
                        </span>
                      </label>
                    </div>
                  ))}

                </div>

                {errors.type && (
                  <div
                    style={{
                      fontSize: 12.5,
                      color: "#dc2626",
                      marginTop: 8,
                    }}
                  >
                    <i className="bi bi-exclamation-circle me-1"></i>
                    {errors.type}
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="section-card mb-4">
              <div className="section-card-header">
                <h2 className="section-card-title">
                  <i className="bi bi-file-text-fill text-muted"></i>
                  Emergency Description
                </h2>
              </div>

              <div className="section-card-body">

                <label
                  className="form-label-custom"
                  htmlFor="description"
                >
                  Describe what is happening{" "}
                  <span style={{ color: "#dc2626" }}>
                    *
                  </span>
                </label>

                <textarea
                  id="description"
                  className="form-control-custom"
                  rows={4}
                  maxLength={500}
                  placeholder="Describe the emergency in detail — location landmarks, number of people affected, visible injuries..."
                  value={form.description}
                  onChange={(e) =>
                    setField(
                      "description",
                      e.target.value
                    )
                  }
                  style={{ resize: "vertical" }}
                />

                {errors.description && (
                  <div
                    style={{
                      fontSize: 12.5,
                      color: "#dc2626",
                      marginTop: 6,
                    }}
                  >
                    <i className="bi bi-exclamation-circle me-1"></i>
                    {errors.description}
                  </div>
                )}

                <div
                  style={{
                    fontSize: 11.5,
                    color: "#94a3b8",
                    marginTop: 5,
                  }}
                >
                  {form.description.length} / 500 characters
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="section-card mb-4">
              <div className="section-card-header">
                <h2 className="section-card-title">
                  <i className="bi bi-geo-alt-fill text-danger"></i>
                  Location
                </h2>
              </div>

              <div className="section-card-body">

                <button
                  type="button"
                  className="btn-primary-custom w-100 mb-3"
                  style={{ justifyContent: "center" }}
                  onClick={detectLocation}
                  disabled={locationLoading}
                  id="detect-location-btn"
                  aria-label="Detect current GPS location"
                >
                  {locationLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm"></span>
                      Detecting location...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-crosshair2"></i>
                      Use My Current Location
                    </>
                  )}
                </button>

                {/* Location detected */}
                {form.locationStatus ===
                  "detected" && (
                  <div
                    style={{
                      background: "#dcfce7",
                      border: "1px solid #bbf7d0",
                      borderRadius: 8,
                      padding: "10px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 13,
                      color: "#166534",
                      marginBottom: 12,
                    }}
                  >
                    <i className="bi bi-check-circle-fill"></i>
                    Location detected successfully
                  </div>
                )}

                {/* Location error */}
                {form.locationStatus ===
                  "error" && (
                  <div
                    style={{
                      background: "#fee2e2",
                      border: "1px solid #fecaca",
                      borderRadius: 8,
                      padding: "10px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 13,
                      color: "#991b1b",
                      marginBottom: 12,
                    }}
                  >
                    <i className="bi bi-exclamation-circle-fill"></i>
                    Unable to detect location. Please
                    enable location access or enter
                    manually.
                  </div>
                )}

                {/* Manual coordinates */}
                <div className="row g-2">

                  <div className="col-6">
                    <label
                      className="form-label-custom"
                      htmlFor="lat"
                    >
                      Latitude
                    </label>

                    <input
                      id="lat"
                      type="text"
                      className="form-control-custom"
                      placeholder="e.g. 17.3850"
                      value={form.lat}
                      onChange={(e) =>
                        setField(
                          "lat",
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div className="col-6">
                    <label
                      className="form-label-custom"
                      htmlFor="lng"
                    >
                      Longitude
                    </label>

                    <input
                      id="lng"
                      type="text"
                      className="form-control-custom"
                      placeholder="e.g. 78.4867"
                      value={form.lng}
                      onChange={(e) =>
                        setField(
                          "lng",
                          e.target.value
                        )
                      }
                    />
                  </div>

                </div>
              </div>
            </div>

            {/* Image Upload */}
            <div className="section-card mb-4">
              <div className="section-card-header">
                <h2 className="section-card-title">
                  <i className="bi bi-camera-fill text-muted"></i>
                  Emergency Image{" "}
                  <span
                    style={{
                      fontSize: 11,
                      color: "#94a3b8",
                      fontWeight: 400,
                    }}
                  >
                    (optional)
                  </span>
                </h2>
              </div>

              <div className="section-card-body">

                {imagePreview ? (
                  <div
                    style={{
                      position: "relative",
                    }}
                  >
                    <img
                      src={imagePreview}
                      alt="Emergency preview"
                      style={{
                        width: "100%",
                        maxHeight: 200,
                        objectFit: "cover",
                        borderRadius: 8,
                      }}
                    />

                    <button
                      type="button"
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        background:
                          "rgba(0,0,0,0.6)",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        padding: "4px 10px",
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);

                        if (fileInputRef.current) {
                          fileInputRef.current.value =
                            "";
                        }
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div
                    className="upload-area"
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) =>
                      e.key === "Enter" &&
                      fileInputRef.current?.click()
                    }
                    aria-label="Upload emergency image"
                  >
                    <i
                      className="bi bi-cloud-upload"
                      style={{
                        fontSize: 32,
                        color: "#94a3b8",
                        marginBottom: 10,
                        display: "block",
                      }}
                    ></i>

                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#475569",
                        marginBottom: 4,
                      }}
                    >
                      Upload Emergency Image
                    </div>

                    <div
                      style={{
                        fontSize: 12.5,
                        color: "#94a3b8",
                      }}
                    >
                      Click to browse · JPG, PNG, WEBP
                      up to 10 MB
                    </div>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleImageChange}
                />

              </div>
            </div>

            {/* Additional Info */}
            <div className="section-card mb-4">
              <div className="section-card-header">
                <h2 className="section-card-title">
                  <i className="bi bi-info-circle text-muted"></i>
                  Additional Information{" "}
                  <span
                    style={{
                      fontSize: 11,
                      color: "#94a3b8",
                      fontWeight: 400,
                    }}
                  >
                    (optional)
                  </span>
                </h2>
              </div>

              <div className="section-card-body">

                <textarea
                  className="form-control-custom"
                  rows={2}
                  placeholder="Any other details responders should know..."
                  value={form.additionalInfo}
                  onChange={(e) =>
                    setField(
                      "additionalInfo",
                      e.target.value
                    )
                  }
                  style={{ resize: "none" }}
                />

              </div>
            </div>

            {/* Submit error */}
            {errors.submit && (
              <div className="alert-emergency mb-3">
                <i className="bi bi-exclamation-triangle-fill alert-icon"></i>

                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      color: "#991b1b",
                      fontSize: 13.5,
                    }}
                  >
                    {errors.submit}
                  </div>
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="btn-emergency w-100"
              style={{
                justifyContent: "center",
                fontSize: 16,
                padding: "16px 24px",
              }}
              disabled={loading}
              id="submit-emergency-btn"
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm"></span>
                  Submitting Emergency...
                </>
              ) : (
                <>
                  <i className="bi bi-send-fill"></i>
                  SUBMIT EMERGENCY
                </>
              )}
            </button>

            <p
              style={{
                textAlign: "center",
                fontSize: 12.5,
                color: "#94a3b8",
                marginTop: 12,
              }}
            >
              Professional emergency responders will
              be notified after the incident is analyzed.
            </p>

          </form>
        </div>
      </div>
    </AppLayout>
  );
} 