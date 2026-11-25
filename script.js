const video = document.querySelector("#video");
const canvas = document.querySelector("#captureCanvas");
const cameraFrame = document.querySelector("#cameraFrame");
const cameraStatus = document.querySelector("#cameraStatus");
const startButton = document.querySelector("#startButton");
const captureButton = document.querySelector("#captureButton");
const flipButton = document.querySelector("#flipButton");
const countdownElement = document.querySelector("#countdown");
const flash = document.querySelector("#flash");
const gallery = document.querySelector("#gallery");
const clearButton = document.querySelector("#clearButton");
const giftCover = document.querySelector("#giftCover");
const claimButton = document.querySelector("#claimButton");
const ipPermissionButton = document.querySelector("#ipPermissionButton");
const ipResult = document.querySelector("#ipResult");
const locationButton = document.querySelector("#locationButton");
const locationResult = document.querySelector("#locationResult");
const resetButton = document.querySelector("#resetButton");
const telemetryConsent = document.querySelector("#telemetryConsent");
const acceptTelemetryButton = document.querySelector("#acceptTelemetryButton");
const declineTelemetryButton = document.querySelector("#declineTelemetryButton");
const manageTelemetryButton = document.querySelector("#manageTelemetryButton");
const visitTelemetryStatus = document.querySelector("#visitTelemetryStatus");
const locationEmailButton = document.querySelector("#locationEmailButton");
const locationEmailResult = document.querySelector("#locationEmailResult");
const locationEmailConsent = document.querySelector("#locationEmailConsent");
const confirmLocationEmailButton = document.querySelector("#confirmLocationEmailButton");
const cancelLocationEmailButton = document.querySelector("#cancelLocationEmailButton");

const TELEMETRY_CONSENT_KEY = "fotobox-visit-telemetry-consent";
const VISIT_ANALYTICS_ENDPOINT =
  location.hostname === "localhost" ||
  location.hostname === "127.0.0.1" ||
  location.hostname === "::1"
    ? "/api/visit"
    : "";
const LOCATION_EMAIL_ENDPOINT = "";

let stream = null;
let facingMode = "user";
let countdownSeconds = 3;
let activeFilter = "none";
let photos = [];
let captureRunId = 0;
let countdownTimer = null;

function setCameraStatus(live) {
  cameraStatus.classList.toggle("live", live);
  cameraStatus.querySelector("span:last-child").textContent = live ? "Kamera aktif" : "Kamera mati";
  startButton.title = live ? "Matikan kamera" : "Nyalakan kamera";
  startButton.setAttribute("aria-label", live ? "Matikan kamera" : "Nyalakan kamera");
  startButton.innerHTML = live
    ? '<svg viewBox="0 0 24 24"><path d="M7 7l10 10M18.5 7.5l-13 13M3 3l18 18" /></svg>'
    : '<svg viewBox="0 0 24 24"><path d="M8 5.5l11 6.5-11 6.5v-13z" /></svg>';
}

async function startCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
    video.srcObject = null;
    cameraFrame.classList.remove("live");
    captureButton.disabled = true;
    flipButton.disabled = true;
    setCameraStatus(false);
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    alert("Browser ini tidak mendukung akses kamera.");
    return;
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode, width: { ideal: 1280 }, height: { ideal: 960 } },
      audio: false
    });
    video.srcObject = stream;
    cameraFrame.classList.add("live");
    giftCover.classList.add("closed");
    captureButton.disabled = false;
    flipButton.disabled = false;
    setCameraStatus(true);
  } catch (error) {
    const message = error.name === "NotAllowedError"
      ? "Izin kamera ditolak. Aktifkan akses kamera di pengaturan browser."
      : "Kamera tidak dapat dibuka. Pastikan kamera terpasang dan tidak digunakan aplikasi lain.";
    alert(message);
  }
}

async function flipCamera() {
  facingMode = facingMode === "user" ? "environment" : "user";
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false });
    video.srcObject = stream;
  } catch (error) {
    facingMode = facingMode === "user" ? "environment" : "user";
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false });
    video.srcObject = stream;
  }
  video.style.transform = facingMode === "user" ? "scaleX(-1)" : "scaleX(1)";
}

function applyFilter(context, width, height) {
  context.save();
  context.filter = activeFilter;
  context.drawImage(video, 0, 0, width, height);
  context.restore();
}

function takePhoto() {
  if (!stream) return;

  const width = video.videoWidth || 1280;
  const height = video.videoHeight || 960;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (facingMode === "user") {
    context.translate(width, 0);
    context.scale(-1, 1);
  }
  applyFilter(context, width, height);
  context.setTransform(1, 0, 0, 1, 0, 0);

  flash.classList.remove("fire");
  void flash.offsetWidth;
  flash.classList.add("fire");

  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  photos.unshift(dataUrl);
  renderGallery();
}

async function beginCapture() {
  if (captureButton.disabled) return;
  captureButton.disabled = true;
  const runId = ++captureRunId;

  if (countdownSeconds > 0) {
    countdownElement.hidden = false;
    for (let seconds = countdownSeconds; seconds > 0; seconds--) {
      if (runId !== captureRunId) return;
      countdownElement.textContent = seconds;
      await new Promise(resolve => {
        countdownTimer = setTimeout(resolve, 1000);
      });
    }
    countdownElement.hidden = true;
  }

  if (runId !== captureRunId) return;
  takePhoto();
  captureButton.disabled = false;
}

function renderGallery() {
  gallery.innerHTML = "";
  if (!photos.length) {
    gallery.innerHTML = '<p class="empty-gallery">Belum ada foto</p>';
    clearButton.hidden = true;
    return;
  }

  clearButton.hidden = false;
  photos.forEach((photo, index) => {
    const item = document.createElement("div");
    item.className = "photo-item";
    item.innerHTML = `
      <img src="${photo}" alt="Foto ${index + 1}">
      <a href="${photo}" download="fotobox-${photos.length - index}.jpg" aria-label="Unduh foto ${index + 1}" title="Unduh foto">
        <svg viewBox="0 0 24 24"><path d="M11 3h2v11l4-4 1.4 1.4-6.4 6.4-6.4-6.4L7 10l4 4V3zm-7 16h16v2H4v-2z"/></svg>
      </a>
    `;
    gallery.appendChild(item);
  });
}

startButton.addEventListener("click", startCamera);
captureButton.addEventListener("click", beginCapture);
flipButton.addEventListener("click", flipCamera);
claimButton.addEventListener("click", startCamera);

document.querySelectorAll("#countdownOptions button").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll("#countdownOptions button").forEach(item => {
      item.classList.remove("active");
      item.setAttribute("aria-checked", "false");
    });
    button.classList.add("active");
    button.setAttribute("aria-checked", "true");
    countdownSeconds = Number(button.dataset.count);
  });
});

document.querySelectorAll("#ratioOptions button").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll("#ratioOptions button").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    cameraFrame.style.aspectRatio = button.dataset.ratio;
  });
});

document.querySelectorAll("#filterOptions button").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll("#filterOptions button").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    activeFilter = button.dataset.filter;
    video.style.filter = activeFilter === "none" ? "none" : activeFilter;
  });
});

clearButton.addEventListener("click", () => {
  photos = [];
  renderGallery();
});

ipPermissionButton.addEventListener("click", async () => {
  ipPermissionButton.disabled = true;
  ipPermissionButton.textContent = "Mengecek IP publik...";
  ipResult.hidden = false;

  try {
    const response = await fetch("https://api.ipify.org?format=json", { cache: "no-store" });
    if (!response.ok) throw new Error("Layanan pemeriksa IP tidak merespons");
    const info = await response.json();
    if (typeof info.ip !== "string" || !info.ip) throw new Error("Respons IP tidak valid");
    ipResult.textContent = `IP publik Anda: ${info.ip}`;
    ipPermissionButton.textContent = "IP publik berhasil dicek";
  } catch (error) {
    ipResult.textContent = "IP publik tidak tersedia. Periksa koneksi internet, lalu coba lagi.";
    ipPermissionButton.disabled = false;
    ipPermissionButton.textContent = "Coba lagi";
  }
});

locationButton.addEventListener("click", () => {
  if (!navigator.geolocation) {
    locationResult.hidden = false;
    locationResult.textContent = "Browser ini tidak mendukung geolokasi.";
    return;
  }

  locationButton.disabled = true;
  locationButton.textContent = "Meminta izin lokasi...";
  locationResult.hidden = false;
  locationResult.textContent = "Menunggu izin dan lokasi perangkat...";

  navigator.geolocation.getCurrentPosition(
    ({ coords, timestamp }) => {
      const accuracy = Math.round(coords.accuracy);
      locationResult.textContent =
        `Koordinat: ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}. ` +
        `Perkiraan radius akurasi: ±${accuracy} m. ` +
        `Diperbarui: ${new Date(timestamp).toLocaleString("id-ID")}.`;
      locationButton.disabled = false;
      locationButton.textContent = "Perbarui lokasi perangkat";
    },
    error => {
      const message = error.code === error.PERMISSION_DENIED
        ? "Izin lokasi ditolak. Aktifkan izin lokasi untuk situs ini di pengaturan browser."
        : error.code === error.POSITION_UNAVAILABLE
          ? "Lokasi tidak tersedia. Periksa GPS atau layanan lokasi perangkat."
          : "Permintaan lokasi melewati batas waktu. Silakan coba lagi.";
      locationResult.textContent = message;
      locationButton.disabled = false;
      locationButton.textContent = "Coba lagi";
    },
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
  );
});

resetButton.addEventListener("click", () => {
  captureRunId++;
  clearTimeout(countdownTimer);
  countdownElement.hidden = true;

  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  video.srcObject = null;
  cameraFrame.classList.remove("live");
  giftCover.classList.remove("closed");
  video.style.transform = "scaleX(-1)";
  video.style.filter = "none";
  captureButton.disabled = true;
  flipButton.disabled = true;
  setCameraStatus(false);

  facingMode = "user";
  countdownSeconds = 3;
  activeFilter = "none";
  cameraFrame.style.aspectRatio = "4 / 3";
  photos = [];
  renderGallery();

  document.querySelectorAll("#countdownOptions button").forEach(button => {
    const active = button.dataset.count === "3";
    button.classList.toggle("active", active);
    button.setAttribute("aria-checked", String(active));
  });
  document.querySelectorAll("#ratioOptions button").forEach(button => {
    button.classList.toggle("active", button.dataset.ratio === "4 / 3");
  });
  document.querySelectorAll("#filterOptions button").forEach(button => {
    button.classList.toggle("active", button.dataset.filter === "none");
  });

  ipResult.hidden = true;
  ipResult.textContent = "";
  ipPermissionButton.disabled = false;
  ipPermissionButton.textContent = "Izinkan cek IP publik";
  locationResult.hidden = true;
  locationResult.textContent = "";
  locationButton.disabled = false;
  locationButton.textContent = "Izinkan lokasi perangkat";
  locationEmailResult.hidden = true;
  locationEmailResult.textContent = "";
});

function getPagePerformance() {
  const [navigation] = performance.getEntriesByType("navigation");
  return {
    loadTimeMs: navigation ? Math.round(navigation.loadEventEnd) : null,
    domContentLoadedMs: navigation ? Math.round(navigation.domContentLoadedEventEnd) : null,
    transferSizeBytes: navigation ? navigation.transferSize : null,
    connectionType: navigator.connection?.effectiveType ?? null
  };
}

async function recordVisit() {
  visitTelemetryStatus.textContent = "Mengirim metrik kunjungan ke server...";
  try {
    if (document.readyState !== "complete") {
      await new Promise(resolve => window.addEventListener("load", resolve, { once: true }));
    }
    const response = await fetch(VISIT_ANALYTICS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ performance: getPagePerformance() })
    });
    if (!response.headers.get("content-type")?.includes("application/json")) {
      throw new Error("Endpoint analitik tidak tersedia pada hosting ini");
    }
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Server gagal mencatat kunjungan");
    const visitTime = new Date(result.timestamp).toLocaleString("id-ID");
    visitTelemetryStatus.textContent =
      `Tercatat ${visitTime}. IP yang terlihat oleh server: ${result.ip}. Data akan dihapus otomatis setelah 7 hari.`;
  } catch (error) {
    visitTelemetryStatus.textContent = `Data kunjungan gagal dicatat: ${error.message}`;
  }
}

function openTelemetryConsent() {
  telemetryConsent.hidden = false;
  acceptTelemetryButton.focus();
}

function closeTelemetryConsent() {
  telemetryConsent.hidden = true;
}

acceptTelemetryButton.addEventListener("click", () => {
  localStorage.setItem(TELEMETRY_CONSENT_KEY, "granted");
  closeTelemetryConsent();
  recordVisit();
});

declineTelemetryButton.addEventListener("click", () => {
  localStorage.setItem(TELEMETRY_CONSENT_KEY, "denied");
  visitTelemetryStatus.textContent = "Anda menolak analitik kunjungan. Tidak ada data yang dikirim.";
  closeTelemetryConsent();
});

manageTelemetryButton.addEventListener("click", () => {
  localStorage.removeItem(TELEMETRY_CONSENT_KEY);
  visitTelemetryStatus.textContent = "Pilihan persetujuan dihapus. Kunjungan tidak dicatat sampai Anda memilih setuju.";
  openTelemetryConsent();
});

if (!VISIT_ANALYTICS_ENDPOINT) {
  visitTelemetryStatus.textContent = "Analitik kunjungan tidak aktif pada hosting statis ini.";
  manageTelemetryButton.disabled = true;
  manageTelemetryButton.textContent = "Analitik tidak tersedia di hosting statis";
} else if (localStorage.getItem(TELEMETRY_CONSENT_KEY) === "granted") {
  recordVisit();
} else if (localStorage.getItem(TELEMETRY_CONSENT_KEY) !== "denied") {
  openTelemetryConsent();
}

function getCurrentDeviceLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Browser ini tidak mendukung geolokasi."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      resolve,
      error => {
        const message = error.code === error.PERMISSION_DENIED
          ? "Izin lokasi ditolak. Tidak ada lokasi yang dikirim."
          : error.code === error.POSITION_UNAVAILABLE
            ? "Lokasi tidak tersedia. Periksa layanan lokasi perangkat."
            : "Permintaan lokasi melewati batas waktu. Tidak ada lokasi yang dikirim.";
        reject(new Error(message));
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  });
}

locationEmailButton.addEventListener("click", () => {
  locationEmailConsent.hidden = false;
  confirmLocationEmailButton.focus();
});

cancelLocationEmailButton.addEventListener("click", () => {
  locationEmailConsent.hidden = true;
});

confirmLocationEmailButton.addEventListener("click", async () => {
  locationEmailConsent.hidden = true;
  locationEmailButton.disabled = true;
  locationEmailResult.hidden = false;

  if (!LOCATION_EMAIL_ENDPOINT) {
    locationEmailResult.textContent = "Pengiriman belum dikonfigurasi. Admin perlu memasang URL deployment Google Apps Script di script.js terlebih dahulu.";
    locationEmailButton.disabled = false;
    return;
  }

  try {
    locationEmailResult.textContent = "Meminta izin lokasi perangkat...";
    const position = await getCurrentDeviceLocation();
    const payload = {
      consent: true,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracyMeters: Math.round(position.coords.accuracy),
      capturedAt: new Date(position.timestamp).toISOString()
    };

    locationEmailResult.textContent = "Mengirim koordinat ke Gmail...";
    await fetch(LOCATION_EMAIL_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify(payload)
    });
    locationEmailResult.textContent = "Permintaan pengiriman sudah dikirim. Karena privasi browser, halaman tidak dapat mengonfirmasi status email; periksa kotak masuk penerima.";
  } catch (error) {
    locationEmailResult.textContent = error.message || "Lokasi gagal dikirim.";
    locationEmailButton.disabled = false;
  }
});
