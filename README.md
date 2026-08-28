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
- All devices on the **same Wi-Fi network** (or personal hotspot)

No app installs needed on the phone — everything runs in the mobile browser.

---




## 2. How to play

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

## 3. How it works

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

## lINK TO TRY IT -> https://motion-arcade-1.onrender.com/

