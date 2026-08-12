# PLANE HUNTER

Point your phone at the sky, hold a real aircraft in the crosshair for two seconds,
and it goes in your collection. 223 aircraft types, 94 airlines, 166 airports, 114 flags.

Single HTML file. No build step, no dependencies, no tracking. Everything you catch
is stored on your own device, in localStorage.

## Deploy

```bash
git init
git add .
git commit -m "plane hunter"
git branch -M main
git remote add origin git@github.com:YOURNAME/plane-hunter.git
git push -u origin main
```

Then on vercel.com: **Add New → Project → import the repo → Deploy.**
No settings to change. It is a static site plus one edge function.

Open the deployed URL on your phone and use **Share → Add to Home Screen**.
It runs full screen with no browser chrome.

## Why it has to be hosted

Camera, compass and GPS are only available over HTTPS. Opened as a local file the
app still works, but it falls back to a painted sky you drag around with your finger,
and the aircraft are simulated.

## Live aircraft data

`api/planes.js` proxies [airplanes.live](https://airplanes.live/) and caches the
response at Vercel's edge for 10 seconds, which is also how often the app polls. Their
API is rate limited to 1 request per second and is **non-commercial use only**. If you
get real use out of this, run a receiver and feed the network back.

Your position is snapped to a 0.1° grid **in the browser, before the request is made**.
That matters for two reasons. The CDN keys its cache on the whole URL, so callers only
share a cached response if they share the query string — sending full precision gave
every position its own cache entry and defeated the cache entirely. And it means your
exact coordinates genuinely never leave the device; the app asks about a ~10 km cell,
not about you.

The practical effect: requests to airplanes.live scale with the number of *populated
grid cells*, not with the number of players or how far they walk. One cell being
watched continuously costs about one upstream call every 10 seconds no matter how many
people are in it. The app only polls while it is open and in the foreground.

## Location

On first run the app asks for your location, and keeps following it while you use it —
bearings are computed from where you are standing, so a stale position quietly rotates
every marker off target as you move.

If you decline, or the fix fails, the app **stays on the simulated sky and says so**.
It will not show you real aircraft from somewhere else and let you assume they are
overhead. You can also type a position in by hand under settings.

## Compass accuracy

Your phone's compass points at magnetic north. Aircraft bearings are true north. The
difference runs from roughly 20° west to 15° east across the United States, and it
rotates every marker off target by that much.

There is a **magnetic declination** field in settings. Look yours up on NOAA's
declination calculator and type it in — east positive, west negative. If aiming already
lines up, leave it at zero.

Observer altitude is taken from the GPS fix where the device reports it. Aircraft
altitudes are above sea level, but what you aim at is height above *you*: standing in
Denver, an airliner at 31,000 ft is 25,600 ft overhead, not 31,000.

## How the sky works

The background colour is not a theme. It is a single flat field whose colour comes from
the sun's actual altitude at your coordinates, computed from a solar position algorithm,
and updated every minute:
daylight, low sun, golden hour, sunset, then civil, nautical and astronomical twilight,
then night. The stars fade in as the sun goes down. The interface stays in night tones
so it still reads at noon.

The whole interface is flat on purpose: one opaque colour per surface, no gradients, no
translucency, no glows or soft shadows.

## Catching

There is no catch button. In **HUNT**, centre an aircraft in the crosshair and keep it
there. The ring fills over two seconds and decays if you drift off. The **SCOPE** tab
finds aircraft and hands them to HUNT with an arrow telling you which way to turn.

Markers are four corner brackets around an empty middle, never a filled icon: when you
can actually see the aircraft, the marker frames it instead of covering it.

Device orientation is filtered as a quaternion rather than as three Euler angles,
because aiming upward sits on the singularity of the angle triple the browser reports.
The filter picks its time constant by coherence — the average of the step vectors
cancels for zero-mean magnetometer jitter but not for a deliberate pan — so it holds
steady indoors without lagging when you swing the phone.

## The DEX

Starts empty. Aircraft only appear once you have caught one. Everything counts how
many times you have logged it, not just whether you have.

## Accuracy notes

Bearings are great-circle. Elevation accounts for the curvature of the Earth, so an
airliner past roughly 190 nm is correctly reported as below the horizon rather than
drawn underground. Aircraft specifications are reference figures for the type family,
rounded; "active" counts are approximate and used to grade rarity.

`verify.js` in the repo history covers the orientation maths, screen projection, solar
position and geodesy against independently computed values.

## Licence

Do what you like with it. Aircraft data compiled from public sources.
Flight data belongs to airplanes.live and its volunteer feeders.
