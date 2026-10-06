import { useState, useRef, useEffect, useCallback } from 'react';
import {
  formatDistance,
  verifyEvidenceLocation,
  MAX_EVIDENCE_DISTANCE_METERS,
  MAX_ACCEPTABLE_ACCURACY,
} from '../services/locationService';
import './LiveCameraModal.css';

/**
 * Live Emergency Camera & Location Verification Component
 *
 * Strictly enforces LIVE CAMERA capture (no file uploads) and
 * automatically captures GPS coordinates to verify that the evidence
 * was taken within 500 meters of the reported incident location.
 */
export function LiveCameraModal({
  isOpen,
  mode = 'photo', // 'photo' | 'video'
  incidentLocation = null, // { lat: string|number, lng: string|number, formattedAddress?: string }
  onCapture, // callback({ type, dataUrl, name, size, mimeType, latitude, longitude, accuracy, capturedAt, distanceFromIncident, locationVerified, verificationStatus, verificationDetails })
  onClose,
  onReviewIncidentLocation, // callback to scroll/navigate to incident location step
}) {
  const [cameraState, setCameraState] = useState('initializing'); // 'initializing' | 'streaming' | 'error' | 'captured'
  const [cameraError, setCameraError] = useState(null); // { type: 'camera' | 'location', message: string }
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' | 'user'

  // Location tracking state
  const [gpsState, setGpsState] = useState({
    status: 'detecting', // 'detecting' | 'detected' | 'error' | 'denied'
    latitude: null,
    longitude: null,
    accuracy: null,
    timestamp: null,
    errorMessage: '',
  });

  // Video recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  // Captured evidence preview and verification result
  const [capturedEvidence, setCapturedEvidence] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);

  // References
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const gpsRef = useRef({
    latitude: null,
    longitude: null,
    accuracy: null,
    timestamp: null,
  });

  /**
   * Stop all active media tracks
   */
  const stopMediaTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore track stop error
        }
      });
      streamRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  /**
   * Helper to acquire fresh high-accuracy GPS position on demand
   */
  const acquireFreshLocation = useCallback(() => {
    return new Promise((resolve) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        return resolve(null);
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const data = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy ? Math.round(pos.coords.accuracy) : null,
            timestamp: new Date(pos.timestamp || Date.now()).toISOString(),
          };
          gpsRef.current = data;
          setGpsState({
            status: 'detected',
            ...data,
            errorMessage: '',
          });
          resolve(data);
        },
        (err) => {
          console.warn('Geolocation capture error:', err);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  /**
   * Capture high-accuracy GPS location
   */
  const captureGpsLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsState({
        status: 'error',
        latitude: null,
        longitude: null,
        accuracy: null,
        timestamp: null,
        errorMessage: 'Geolocation is not supported on this device.',
      });
      return;
    }

    setGpsState((prev) => ({ ...prev, status: 'detecting', errorMessage: '' }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const data = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy ? Math.round(pos.coords.accuracy) : null,
          timestamp: new Date(pos.timestamp || Date.now()).toISOString(),
        };
        gpsRef.current = data;
        setGpsState({
          status: 'detected',
          ...data,
          errorMessage: '',
        });
      },
      (err) => {
        let msg = 'Could not detect your GPS location.';
        let status = 'error';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location permission was denied. Location access is required to verify evidence near the incident.';
          status = 'denied';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Location detection timed out. Please try again in an open area.';
        }
        gpsRef.current = {
          latitude: null,
          longitude: null,
          accuracy: null,
          timestamp: null,
        };
        setGpsState({
          status,
          latitude: null,
          longitude: null,
          accuracy: null,
          timestamp: null,
          errorMessage: msg,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  /**
   * Initialize and start camera stream
   */
  const startCamera = useCallback(async () => {
    stopMediaTracks();
    setCameraState('initializing');
    setCameraError(null);
    setCapturedEvidence(null);
    setVerificationResult(null);
    setIsRecording(false);
    setRecordSeconds(0);

    // Concurrently trigger fresh GPS detection
    captureGpsLocation();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraState('error');
      setCameraError({
        type: 'camera',
        message: 'Camera API (getUserMedia) is not supported in this browser.',
      });
      return;
    }

    try {
      let stream = null;
      const videoConstraints = {
        facingMode: { ideal: facingMode },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      };

      try {
        // Attempt with preferred facingMode
        stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: mode === 'video',
        });
      } catch (firstErr) {
        // Fallback without strict facingMode if environment camera fails
        console.warn('[LiveCamera] Falling back to generic video constraint:', firstErr);
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: mode === 'video',
          });
        } catch (audioErr) {
          console.warn('[LiveCamera] Falling back without audio:', audioErr);
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch((e) => console.warn('Video play error:', e));
          setCameraState('streaming');
        };
      } else {
        setCameraState('streaming');
      }
    } catch (err) {
      console.error('[LiveCamera] Camera access failed:', err);
      setCameraState('error');
      setCameraError({
        type: 'camera',
        message:
          err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
            ? 'Camera access was denied. Camera permission is required to capture live emergency evidence.'
            : err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError'
            ? 'No camera found on this device.'
            : 'Unable to access device camera. Please check browser permissions and try again.',
      });
    }
  }, [facingMode, mode, captureGpsLocation, stopMediaTracks]);

  // Start or stop camera when modal opens/closes or mode changes
  useEffect(() => {
    let mounted = true;
    if (isOpen) {
      const timer = setTimeout(() => {
        if (mounted) {
          startCamera();
        }
      }, 0);
      return () => {
        mounted = false;
        clearTimeout(timer);
        stopMediaTracks();
      };
    } else {
      stopMediaTracks();
    }
    return () => {
      mounted = false;
      stopMediaTracks();
    };
  }, [isOpen, startCamera, stopMediaTracks]);

  // Video recording timer interval
  useEffect(() => {
    if (isRecording) {
      timerIntervalRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } else if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isRecording]);

  /**
   * Perform incident location verification on evidence GPS
   */
  const evaluateLocationVerification = useCallback(
    (lat, lng, accuracy) => {
      const incLat = incidentLocation?.lat ? parseFloat(incidentLocation.lat) : null;
      const incLng = incidentLocation?.lng ? parseFloat(incidentLocation.lng) : null;

      const result = verifyEvidenceLocation({
        incidentLat: incLat,
        incidentLng: incLng,
        evidenceLat: lat,
        evidenceLng: lng,
        accuracy,
        maxDistance: MAX_EVIDENCE_DISTANCE_METERS,
        maxAccuracy: MAX_ACCEPTABLE_ACCURACY,
      });

      return {
        ...result,
        incidentLat: incLat,
        incidentLng: incLng,
        evidenceLat: lat,
        evidenceLng: lng,
      };
    },
    [incidentLocation]
  );

  /**
   * Photo Capture Handler
   */
  const handleCapturePhoto = async () => {
    if (!videoRef.current || cameraState !== 'streaming') return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const capturedAt = new Date().toISOString();

    let coords = gpsRef.current.latitude ? gpsRef.current : await acquireFreshLocation();
    const lat = coords?.latitude ?? gpsState.latitude;
    const lng = coords?.longitude ?? gpsState.longitude;
    const accuracy = coords?.accuracy ?? gpsState.accuracy;

    const verification = evaluateLocationVerification(lat, lng, accuracy);

    // Stop live stream tracks
    stopMediaTracks();

    setCapturedEvidence({
      type: 'image',
      name: `live_photo_${Date.now()}.jpg`,
      mimeType: 'image/jpeg',
      dataUrl,
      size: Math.round((dataUrl.length * 3) / 4),
      capturedAt,
      latitude: lat,
      longitude: lng,
      accuracy,
    });
    setVerificationResult(verification);
    setCameraState('captured');
  };

  /**
   * Start Video Recording Handler
   */
  const handleStartRecording = () => {
    if (!streamRef.current || isRecording) return;

    recordedChunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : MediaRecorder.isTypeSupported('video/webm')
      ? 'video/webm'
      : 'video/mp4';

    try {
      const recorder = new MediaRecorder(streamRef.current, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const dataUrl = reader.result;
          const capturedAt = new Date().toISOString();

          let coords = gpsRef.current.latitude ? gpsRef.current : await acquireFreshLocation();
          const lat = coords?.latitude ?? gpsState.latitude;
          const lng = coords?.longitude ?? gpsState.longitude;
          const accuracy = coords?.accuracy ?? gpsState.accuracy;

          const verification = evaluateLocationVerification(lat, lng, accuracy);

          // Stop camera stream
          stopMediaTracks();

          setCapturedEvidence({
            type: 'video',
            name: `live_video_${Date.now()}.${mimeType.includes('mp4') ? 'mp4' : 'webm'}`,
            mimeType,
            dataUrl,
            size: blob.size,
            capturedAt,
            latitude: lat,
            longitude: lng,
            accuracy,
          });
          setVerificationResult(verification);
          setCameraState('captured');
        };
        reader.readAsDataURL(blob);
      };

      recorder.start(1000); // 1-second chunks
      setRecordSeconds(0);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start MediaRecorder:', err);
      setCameraError({
        type: 'camera',
        message: 'Could not start video recording: ' + err.message,
      });
    }
  };

  /**
   * Stop Video Recording Handler
   */
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('MediaRecorder stop error:', e);
      }
      setIsRecording(false);
    }
  };

  /**
   * Confirm & Attach Evidence
   */
  const handleConfirmEvidence = () => {
    if (!capturedEvidence || !onCapture) return;

    // SECURITY: Only location-verified evidence can be accepted.
    if (!verificationResult?.verified) {
      console.warn('[LiveCamera] Evidence rejected: location not verified.');
      return;
    }

    const payload = {
      ...capturedEvidence,
      distanceFromIncident: verificationResult.distance,
      locationVerified: true,
      verificationStatus: verificationResult.status || 'LOCATION_VERIFIED',
      incidentLatitude: verificationResult.incidentLat ?? null,
      incidentLongitude: verificationResult.incidentLng ?? null,
      verificationDetails: {
        accuracy: capturedEvidence.accuracy,
        distanceMeters: verificationResult.distance,
        maxAllowedMeters: MAX_EVIDENCE_DISTANCE_METERS,
        timestamp: capturedEvidence.capturedAt,
        status: verificationResult.status,
        message: verificationResult.message,
      },
    };

    onCapture(payload);
    handleClose();
  };

  /**
   * Toggle between front and rear cameras
   */
  const handleFlipCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  /**
   * Close modal & clean up
   */
  const handleClose = () => {
    stopMediaTracks();
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  // Format recording timer: mm:ss
  const formatTimer = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Format timestamp for display
  const formatDisplayTime = (isoString) => {
    if (!isoString) return 'Now';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div
      className="live-cam-backdrop"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="live-cam-title"
    >
      <div className="live-cam-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="live-cam-header">
          <div className="live-cam-title-group">
            <div className="live-cam-badge-icon" aria-hidden="true">
              {mode === 'video' ? (
                <i className="bi bi-camera-video-fill"></i>
              ) : (
                <i className="bi bi-camera-fill"></i>
              )}
            </div>
            <div>
              <h2 className="live-cam-title" id="live-cam-title">
                LIVE EMERGENCY CAMERA
              </h2>
              <p className="live-cam-subtitle">
                Official Emergency Response Evidence Capture &middot; GPS Verified
              </p>
            </div>
          </div>
          <button
            type="button"
            className="live-cam-btn-close"
            onClick={handleClose}
            aria-label="Close camera"
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {/* Modal Body */}
        <div className="live-cam-body">
          {/* CAMERA / LOCATION PERMISSION ERROR STATE */}
          {cameraState === 'error' && cameraError && (
            <div className="live-cam-permission-error" role="alert">
              <div className="permission-icon-wrapper">
                <i className="bi bi-camera-video-off-fill"></i>
              </div>
              <h3 className="permission-title">Camera Access Required</h3>
              <p className="permission-desc">{cameraError.message}</p>
              <button
                type="button"
                className="btn-cam-retry"
                onClick={startCamera}
              >
                <i className="bi bi-arrow-clockwise me-1"></i> Try Again
              </button>
            </div>
          )}

          {/* ACTIVE LIVE STREAMING OR RECORDING */}
          {cameraState !== 'error' && cameraState !== 'captured' && (
            <>
              <div className="live-cam-stage">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="live-cam-video"
                />

                {/* Overlays */}
                <div className="live-cam-overlay-top">
                  {/* Video Recording Badge */}
                  {mode === 'video' && isRecording ? (
                    <div className="live-cam-pill live-cam-pill-recording">
                      <span className="live-cam-rec-dot"></span>
                      <span>RECORDING {formatTimer(recordSeconds)}</span>
                    </div>
                  ) : (
                    /* GPS Detection Pill */
                    <div
                      className={`live-cam-pill live-cam-pill-gps ${
                        gpsState.status === 'detected'
                          ? gpsState.accuracy && gpsState.accuracy > MAX_ACCEPTABLE_ACCURACY
                            ? 'warning'
                            : 'detected'
                          : gpsState.status === 'denied' || gpsState.status === 'error'
                          ? 'error'
                          : ''
                      }`}
                    >
                      {gpsState.status === 'detecting' ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm"
                            style={{ width: '10px', height: '10px' }}
                            role="status"
                            aria-hidden="true"
                          ></span>
                          <span>Detecting GPS...</span>
                        </>
                      ) : gpsState.status === 'detected' ? (
                        <>
                          <i className="bi bi-geo-alt-fill"></i>
                          <span>
                            GPS Detected (&plusmn;{gpsState.accuracy || 10}m)
                          </span>
                        </>
                      ) : (
                        <>
                          <i className="bi bi-exclamation-triangle-fill"></i>
                          <span>GPS Required</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Camera flip button */}
                  <button
                    type="button"
                    className="live-cam-btn-flip"
                    onClick={handleFlipCamera}
                    title="Switch camera"
                    aria-label="Switch front and rear camera"
                  >
                    <i className="bi bi-arrow-repeat"></i>
                  </button>
                </div>
              </div>

              {/* Warning if GPS permission was denied */}
              {gpsState.status === 'denied' && (
                <div className="verify-status-banner mismatch">
                  <i className="bi bi-geo-alt-slash-fill fs-5"></i>
                  <div>
                    <div className="fw-bold">Location Access Required</div>
                    <div>
                      GPS location is mandatory to verify that emergency evidence was captured at the incident. Please allow location access and tap Retry.
                    </div>
                    <button
                      type="button"
                      className="btn-cam-retry mt-2"
                      onClick={captureGpsLocation}
                    >
                      <i className="bi bi-geo-fill me-1"></i> Enable Location / Try Again
                    </button>
                  </div>
                </div>
              )}

              {/* Controls */}
              <div className="live-cam-controls">
                {mode === 'photo' ? (
                  <button
                    type="button"
                    className="btn-cam-capture"
                    onClick={handleCapturePhoto}
                    disabled={cameraState !== 'streaming' || gpsState.status === 'denied' || gpsState.status === 'detecting'}
                    aria-label="Capture Photo"
                  >
                    {gpsState.status === 'detecting' ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        <span>Acquiring GPS...</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-camera-fill fs-5"></i>
                        <span>CAPTURE PHOTO</span>
                      </>
                    )}
                  </button>
                ) : !isRecording ? (
                  <button
                    type="button"
                    className="btn-cam-capture"
                    onClick={handleStartRecording}
                    disabled={cameraState !== 'streaming' || gpsState.status === 'denied' || gpsState.status === 'detecting'}
                    aria-label="Start Recording Video"
                  >
                    {gpsState.status === 'detecting' ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        <span>Acquiring GPS...</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-record-circle-fill fs-5"></i>
                        <span>START RECORDING</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-cam-record-stop"
                    onClick={handleStopRecording}
                    aria-label="Stop Recording Video"
                  >
                    <i className="bi bi-stop-circle-fill fs-5"></i>
                    <span>STOP RECORDING</span>
                  </button>
                )}
              </div>
            </>
          )}

          {/* CAPTURED EVIDENCE PREVIEW & VERIFICATION UI */}
          {cameraState === 'captured' && capturedEvidence && (
            <>
              {/* Media Preview Stage */}
              <div className="live-cam-stage">
                {capturedEvidence.type === 'video' ? (
                  <video
                    src={capturedEvidence.dataUrl}
                    controls
                    playsInline
                    className="live-cam-preview-media"
                  />
                ) : (
                  <img
                    src={capturedEvidence.dataUrl}
                    alt="Captured Live Evidence"
                    className="live-cam-preview-media"
                  />
                )}
              </div>

              {/* Evidence Verification Card */}
              <div className="evidence-verify-card">
                <div className="evidence-verify-header">
                  <h4 className="evidence-verify-title">
                    <i className="bi bi-shield-check text-primary"></i>
                    Evidence Verification
                  </h4>
                  <span
                    className={`badge d-inline-flex align-items-center gap-1 ${
                      verificationResult?.verified ? 'bg-success' : 'bg-danger'
                    }`}
                    style={{ fontSize: '11px', padding: '5px 10px', borderRadius: '9999px' }}
                  >
                    <i
                      className={`bi ${
                        verificationResult?.verified
                          ? 'bi-check-circle-fill'
                          : 'bi-exclamation-octagon-fill'
                      }`}
                    ></i>
                    <span>
                      {verificationResult?.verified
                        ? 'LOCATION VERIFIED'
                        : 'LOCATION MISMATCH'}
                    </span>
                  </span>
                </div>

                {/* Evidence Details Grid */}
                <div className="evidence-verify-grid">
                  <div className="evidence-verify-item">
                    <span className="verify-label">Evidence Type</span>
                    <span className="verify-value d-inline-flex align-items-center gap-1">
                      <i
                        className={`bi ${
                          capturedEvidence.type === 'video'
                            ? 'bi-camera-video-fill text-danger'
                            : 'bi-camera-fill text-primary'
                        }`}
                      ></i>
                      <span>
                        {capturedEvidence.type === 'video' ? 'Live Video' : 'Live Photo'}
                      </span>
                    </span>
                  </div>

                  <div className="evidence-verify-item">
                    <span className="verify-label">Captured</span>
                    <span className="verify-value">
                      {formatDisplayTime(capturedEvidence.capturedAt)}
                    </span>
                  </div>

                  <div className="evidence-verify-item">
                    <span className="verify-label">GPS Accuracy</span>
                    <span className="verify-value">
                      {capturedEvidence.accuracy
                        ? `${capturedEvidence.accuracy} meters`
                        : 'Accurate (Standard)'}
                    </span>
                  </div>

                  <div className="evidence-verify-item">
                    <span className="verify-label">Distance From Incident</span>
                    <span className="verify-value">
                      {verificationResult?.distance !== null && verificationResult?.distance !== undefined
                        ? formatDistance(verificationResult.distance)
                        : 'Pending Incident GPS'}
                    </span>
                  </div>

                  <div className="evidence-verify-item" style={{ gridColumn: 'span 2' }}>
                    <span className="verify-label">Evidence GPS Location</span>
                    <span className="verify-value font-monospace" style={{ fontSize: '0.8rem' }}>
                      {capturedEvidence.latitude && capturedEvidence.longitude
                        ? `${Number(capturedEvidence.latitude).toFixed(6)}, ${Number(
                            capturedEvidence.longitude
                          ).toFixed(6)}`
                        : 'Unavailable'}
                    </span>
                  </div>

                  {incidentLocation?.lat && incidentLocation?.lng && (
                    <div className="evidence-verify-item" style={{ gridColumn: 'span 2' }}>
                      <span className="verify-label">Reported Incident Location</span>
                      <span className="verify-value font-monospace" style={{ fontSize: '0.8rem' }}>
                        {Number(incidentLocation.lat).toFixed(6)},{' '}
                        {Number(incidentLocation.lng).toFixed(6)}
                        {incidentLocation.formattedAddress
                          ? ` (${incidentLocation.formattedAddress})`
                          : ''}
                      </span>
                    </div>
                  )}
                </div>

                {/* Verification Result Banner */}
                {verificationResult?.verified ? (
                  <div className="verify-status-banner verified" role="status">
                    <i className="bi bi-check-circle-fill fs-5"></i>
                    <div>
                      <div className="fw-bold">LOCATION VERIFIED</div>
                      <div>
                        Evidence captured at the reported incident location ({verificationResult.distance}m away).
                      </div>
                    </div>
                  </div>
                ) : verificationResult?.status === 'LOCATION_MISMATCH' ? (
                  <div className="verify-status-banner mismatch" role="alert">
                    <i className="bi bi-exclamation-octagon-fill fs-5"></i>
                    <div>
                      <div className="fw-bold">LOCATION MISMATCH</div>
                      <div>
                        The captured evidence appears to be outside the reported incident area (distance: {formatDistance(verificationResult.distance)}, max allowed: 500m).
                      </div>
                    </div>
                  </div>
                ) : verificationResult?.status === 'LOW_ACCURACY' ? (
                  <div className="verify-status-banner warning" role="alert">
                    <i className="bi bi-exclamation-triangle-fill fs-5"></i>
                    <div>
                      <div className="fw-bold">LOW GPS ACCURACY</div>
                      <div>
                        Your current location accuracy ({verificationResult.accuracy}m) is low. Please move to an open area and try again.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="verify-status-banner warning" role="alert">
                    <i className="bi bi-info-circle-fill fs-5"></i>
                    <div>
                      <div className="fw-bold">Incident Location Missing</div>
                      <div>
                        Please specify the emergency location in Step 2 to complete verification.
                      </div>
                    </div>
                  </div>
                )}

                {/* Verification Actions */}
                <div className="evidence-verify-actions">
                  <button
                    type="button"
                    className="btn-verify-retake"
                    onClick={startCamera}
                  >
                    <i className="bi bi-arrow-counterclockwise"></i>
                    Retake Evidence
                  </button>

                  {!verificationResult?.verified && onReviewIncidentLocation && (
                    <button
                      type="button"
                      className="btn-verify-retake"
                      onClick={() => {
                        handleClose();
                        onReviewIncidentLocation();
                      }}
                    >
                      <i className="bi bi-geo-alt"></i>
                      Review Incident Location
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn-verify-primary"
                    onClick={handleConfirmEvidence}
                    disabled={!verificationResult?.verified}
                  >
                    <i className="bi bi-check2"></i>
                    Use This Evidence
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
