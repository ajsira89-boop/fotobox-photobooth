# Fotobox

A lightweight browser photobooth with camera capture, countdown, filters, a photo gallery, a privacy control that stops the camera when hiding the preview, and optional location and visit-performance features.

## Run locally

Requires Python 3. Start the server from this directory:

```sh
python3 server.py
```

Open <http://127.0.0.1:4173>.

On first entry, visitors see one privacy panel with separate, unchecked choices for public-IP lookup, location display, location email, and visit analytics. Selected choices apply to this and later visits until changed. Browser camera and geolocation permissions are still requested by the browser itself when needed; those native prompts cannot be merged into the site's panel. Camera starts only after the visitor presses its camera button.

## Optional visit analytics

Visitors are asked for consent in the initial privacy panel before visit analytics are sent. If they opt in, the server records the IP address it sees, the visit time, and page-load metrics. Visitors can decline or change their choice in the app. IP addresses are not a precise way to determine a visitor's province.

The local server stores records in `~/.fotobox/visit_metrics.jsonl` with owner-only file permissions and deletes expired records after seven days. The file is outside the project directory and is not served by the web server. The server suppresses its default request log to avoid a second copy of visitor IPs.

This is a local-development server, not a production deployment configuration. Before deploying publicly, use HTTPS and configure any reverse proxy to provide client IP information only through a trusted mechanism. Review applicable privacy requirements and update the consent text and retention policy for the real deployment. Do not expose the visit data or an analytics-export endpoint publicly.

## Optional consent-based location email

The app can send device coordinates to the fixed recipient `ajsira89@gmail.com` only after a visitor selects the email option in the initial privacy panel and grants browser location permission. The email option is separate from other choices in that same panel. If enabled, location is requested and emailed on each visit until the visitor turns the option off. The email contains latitude, longitude, reported accuracy radius, and capture time. Emails remain in the recipient's mailbox; this app cannot delete them. The Apps Script endpoint caps successful email sends at 10 per UTC day.

To enable it:

1. Sign in to the Google account that owns the recipient mailbox and create a project at <https://script.google.com>.
2. Copy `Code.gs` into the Apps Script editor and save.
3. Select **Deploy → New deployment → Web app**. Set **Execute as** to your account and access to **Anyone**, then deploy and authorize Gmail access. Anyone access is needed for visitors who are not signed in; the endpoint accepts no user-chosen recipient and has a daily send limit.
4. Copy the deployment URL ending in `/exec`. In `script.js`, set `LOCATION_EMAIL_ENDPOINT` to that URL. Commit and publish the updated site.
5. Test using a device you control. The visitor must enable the email option in the privacy panel and grant the browser's location permission.

The browser uses a no-CORS POST so the page cannot verify delivery. Check the recipient mailbox and the Apps Script **Executions** page. Do not add Gmail passwords, app passwords, or deployment secrets to the public repository.

## Project files

- `index.html` — application structure
- `styles.css` — responsive styling
- `script.js` — camera, photo, location, and consent interactions
- `server.py` — static development server and consent-based visit endpoint
- `Code.gs` — optional Gmail sender with a fixed recipient and daily send cap
