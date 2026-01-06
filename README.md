# Sales Navigator Inbox Follow-up Dot

A simple Chrome extension that adds a visual indicator (a red dot) to threads in your LinkedIn Sales Navigator inbox if the last message (sent by you) has been unanswered for a configurable number of days.

## Features

- **Visual Alert**: Adds a red dot next to threads where you are waiting for a reply.
- **Configurable**: Defaults to 1 day, but easily adjustable in the code.
- **Privacy Focused**: Runs entirely locally in your browser. No data is sent to external servers.

## Installation

1.  **Clone or Download**:
    - Clone this repository or download the ZIP.
2.  **Load Unpacked in Chrome**:
    - Open Chrome and navigate to `chrome://extensions`.
    - Enable **Developer mode** (top right).
    - Click **Load unpacked**.
    - Select the folder containing `manifest.json`.
3.  **Usage**:
    - Go to your Sales Navigator Inbox.
    - Threads with no reply for > 1 day (default) will show a red dot.

## Configuration

To change the number of days before the dot appears:

1. Open `content.js`.
2. Locate the line:
   ```javascript
   const FOLLOW_UP_AFTER_DAYS = 1; // <-- change this (e.g., 2, 5, 7)
   ```
3. Change `1` to your desired number of days.
4. Reload the extension in `chrome://extensions` and refresh your Sales Navigator tab.

## Development

- **Icons**: Located in `assets/`.
- **Manifest**: `manifest.json` (Manifest V3).
- **Logic**: `content.js` handles all DOM inspection and caching.

## License

MIT
