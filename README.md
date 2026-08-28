# Motion Arcade 🕹️

**Theme: Perfect Day** — our idea of a perfect day is hanging out with friends,
no consoles or setup required, just the phones already in everyone's pockets.
Motion Arcade turns any room with a laptop and a couple of phones into a
pop-up arcade night in under a minute.

Seven motion-controlled games built for phone-as-controller play.
Works single-player (phone vs CPU) or two-player (two phones vs each other),
all rendered on one big screen (laptop/TV/projector).

**Games included:**
- 🎾 **Swing Tennis** — tilt to move your paddle, swing your phone to hit the ball
- 🏎️ **Tilt Racer** — tilt left/right to steer and dodge obstacles
- ⚔️ **Duel Arena** — swing to attack, tilt back to guard
- 🎳 **Swing Bowl** — tilt to aim down the lane, swing to release the ball
- 🍉 **Fruit Slice** — tilt to move the blade, swing to slice fruit (avoid the bombs!)
- 🏒 **Air Hockey** — tilt left/right and lean forward/back to move your paddle in 2D
- 🤸 **Balance Beam** — lean to stay balanced as random gusts get stronger over time

---

## 1. What you need

- **A laptop** (Windows/Mac/Linux) — this runs the server and shows the game
- **1 or 2 phones** (iPhone or Android, any modern browser — Safari or Chrome work great)
- **Node.js** installed on the laptop — download from [nodejs.org](https://nodejs.org) if you don't have it (LTS version is fine)
- All devices on the **same Wi-Fi network** (or personal hotspot)

No app installs needed on the phone — everything runs in the mobile browser.

---

## 2. One-time setup

Open a terminal in this folder and run:

```bash
npm install
npm start
```

You'll see:
```
Motion Arcade running: http://localhost:3000
```

---

## 3. Getting your phone connected (the important part)

Browsers only allow access to motion/tilt sensors over a **secure (HTTPS) connection**
— `localhost` on the laptop itself is exempt, but your phone is a *different device*,
so it needs an HTTPS URL. There are two easy ways to get one for a live event:

### Option A — ngrok (recommended, works anywhere, 2 minutes)
1. Install [ngrok](https://ngrok.com/download) (free account).
2. With the server running (`npm start`), open a second terminal and run:
   ```bash
   ngrok http 3000
   ```
3. ngrok prints a URL like `https://abcd-1234.ngrok-free.app` — that's your public HTTPS link.
4. On your **laptop**, open that ngrok URL instead of `localhost:3000` to host the game.
5. On your **phone**, open the *same* ngrok URL in the browser to join.

### Option B — Deploy for free (Render / Glitch / Vercel)
If you'd rather not install ngrok, push this folder to [Render.com](https://render.com)
(free web service, auto HTTPS) or [Glitch.com](https://glitch.com) (import the folder,
auto HTTPS). Either gives you a permanent `https://yourapp.onrender.com`-style link
you can reuse at the workshop.

> Local Wi-Fi without HTTPS (e.g. `http://192.168.x.x:3000`) will **not** unlock motion
> sensors on iPhone, and often not on Android either — don't skip this step.

---

## 4. How to play

1. On the **laptop/big screen**: open your HTTPS URL → pick a game cabinet.
2. The screen shows a **4-letter room code**.
3. On **each phone**: open the same HTTPS URL → "Join as Controller" → type in the code.
4. The phone will ask to **enable motion & orientation** — tap "Enable Motion & Tilt"
   and allow the permission prompt (required once per session on iPhone).
5. Once connected, the laptop screen shows "Start Solo (vs CPU)" if one phone joined,
   or "Start 2-Player" once a second phone joins.
6. Hold your phone like a game remote:
   - **Tilt** left/right = steering / aiming / paddle movement
   - **Swing** the phone forward sharply (like a tennis or bowling swing) = hit / attack / release
   - For **Duel Arena guard**: tilt the phone back toward you and hold

---

## 5. Tips for a smooth workshop demo

- Test the HTTPS link and phone permissions **before** the event — iPhone Safari
  sometimes needs the page reloaded once after granting permission.
- Keep the laptop plugged into power and the browser tab active (some browsers pause
  background tabs).
- If a phone shows "disconnected," just rejoin with the same room code — no need to
  restart the laptop game.
- Landscape or portrait both work; portrait is easiest for one-handed tilt + swing.
- Room codes avoid confusing characters (no `0/O`, `1/I`), so they're easy to read
  off a projector.

---

## 6. How it works (for your project writeup / judges)

- **Backend:** Node.js + Express serves the pages; **Socket.io** handles real-time
  messaging between each phone and the display.
- **Sensors:** the phone page uses the browser's `DeviceOrientationEvent` (tilt) and
  `DeviceMotionEvent` (acceleration) APIs — no native app required.
- **Swing detection:** the phone runs a small state machine that watches acceleration
  magnitude for a sharp rise-then-fall pattern, then reports a single "swing" event
  with a power value (0–1) and the tilt direction at the peak of the swing.
- **Rooms:** a 4-character code links up to one display and two controller phones;
  the server just relays `tilt` and `swing` events from phone → display, where each
  game's canvas logic decides what they mean (steer, hit, block, aim).
- Each game (`public/js/games/*.js`) is a self-contained module with a shared interface
  (`handleInput`, `update`, `draw`, `scores`, `over`, `winnerText`), so adding a fifth
  game later is just dropping in a new file.

Have fun, and good luck with the demo! 🌞
