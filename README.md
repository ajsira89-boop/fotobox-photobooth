# Fotobox

A lightweight browser photobooth with camera capture, countdown, filters, a photo gallery, and optional location and visit-performance features.

## Run locally

Requires Python 3. Start the server from this directory:

```sh
python3 server.py
```

Open <http://127.0.0.1:4173>.

Camera and location permissions are requested by the browser only after the visitor chooses the related action. Browser geolocation requires a secure context (HTTPS, or localhost).

## Optional visit analytics

Visitors are asked for consent before visit analytics are sent. If they agree, the server records the IP address it sees, the visit time, and page-load metrics. Visitors can decline or change their choice in the app. IP addresses are not a precise way to determine a visitor's province.

The local server stores records in `~/.fotobox/visit_metrics.jsonl` with owner-only file permissions and deletes expired records after seven days. The file is outside the project directory and is not served by the web server. The server suppresses its default request log to avoid a second copy of visitor IPs.

This is a local-development server, not a production deployment configuration. Before deploying publicly, use HTTPS and configure any reverse proxy to provide client IP information only through a trusted mechanism. Review applicable privacy requirements and update the consent text and retention policy for the real deployment. Do not expose the visit data or an analytics-export endpoint publicly.

## Project files

- `index.html` — application structure
- `styles.css` — responsive styling
- `script.js` — camera, photo, location, and consent interactions
- `server.py` — static development server and consent-based visit endpoint
