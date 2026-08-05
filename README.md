# PLANE HUNTER

Point your phone at the sky, hold a real aircraft in the crosshair for two seconds,
and it goes in your collection. 223 aircraft types, 94 airlines, 166 airports, 114 flags.

Single HTML file. No build step, no dependencies, no tracking. Everything you catch
is stored on your own device.

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
response at Vercel's edge for 8 seconds, so many players in one area collapse into a
single upstream request. Their API is rate limited to 1 request per second and is
**non-commercial use only**. If you get real use out of this, run a receiver and feed
the network back.

Queries are snapped to a 0.1° grid before going upstream — better cache hit rate, and
your exact position never leaves your device.

## How the sky works

The background colour is not a theme. It comes from the sun's actual altitude at your
coordinates, computed from a solar position algorithm, and updates every minute:
daylight, low sun, golden hour, sunset, then civil, nautical and astronomical twilight,
then night. The stars fade in as the sun goes down. The interface stays in night tones
so it still reads at noon.

## Catching

There is no catch button. In **HUNT**, centre an aircraft in the crosshair and keep it
there. The ring fills over two seconds and decays if you drift off. The **SCOPE** tab
finds aircraft and hands them to HUNT with an arrow telling you which way to turn.

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
