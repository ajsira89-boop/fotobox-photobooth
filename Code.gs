const RECIPIENT_EMAIL = "ajsira89@gmail.com";
const DAILY_EMAIL_LIMIT = 10;

function doPost(event) {
  let payload;
  try {
    payload = JSON.parse(event.postData.contents);
  } catch (error) {
    return jsonResponse({ ok: false, error: "Invalid request body" });
  }

  if (payload.consent !== true) {
    return jsonResponse({ ok: false, error: "Consent is required" });
  }

  const latitude = Number(payload.latitude);
  const longitude = Number(payload.longitude);
  const accuracyMeters = Number(payload.accuracyMeters);
  const capturedAt = new Date(payload.capturedAt);
  const now = new Date();

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
      !Number.isFinite(accuracyMeters) || accuracyMeters < 0 || accuracyMeters > 1000000 ||
      Number.isNaN(capturedAt.getTime()) || Math.abs(now.getTime() - capturedAt.getTime()) > 5 * 60 * 1000) {
    return jsonResponse({ ok: false, error: "Invalid location data" });
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    return jsonResponse({ ok: false, error: "Please retry later" });
  }

  try {
    const properties = PropertiesService.getScriptProperties();
    const day = Utilities.formatDate(now, "UTC", "yyyy-MM-dd");
    const storedDay = properties.getProperty("email-limit-day");
    const sentCount = storedDay === day ? Number(properties.getProperty("email-count") || 0) : 0;
    if (sentCount >= DAILY_EMAIL_LIMIT) {
      return jsonResponse({ ok: false, error: "Daily email limit reached" });
    }

    const body = [
      "A visitor explicitly approved sending this device location to this email address.",
      "",
      "Latitude: " + latitude,
      "Longitude: " + longitude,
      "Reported accuracy radius: ±" + Math.round(accuracyMeters) + " m",
      "Location captured at: " + capturedAt.toISOString(),
      "Email received at: " + now.toISOString(),
      "",
      "This location was provided by the visitor's browser. Accuracy depends on the device and available location signals."
    ].join("\n");

    GmailApp.sendEmail(
      RECIPIENT_EMAIL,
      "Fotobox: visitor-approved device location",
      body,
      { name: "Fotobox location consent" }
    );
    properties.setProperties({
      "email-limit-day": day,
      "email-count": String(sentCount + 1)
    });
    return jsonResponse({ ok: true });
  } catch (error) {
    console.error("Location email failed: " + error.message);
    return jsonResponse({ ok: false, error: "Email could not be sent" });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return jsonResponse({ service: "Fotobox location email", status: "ready" });
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
