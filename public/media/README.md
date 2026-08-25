# Hero media

Source: PTL's own Baithak reel — `BAITHAK,25......#vadodara #purnima #garba.mp4`
(1278×720, 32.8s, h.264 + aac).

| File              | Size   | What it is                                                   |
| ----------------- | ------ | ------------------------------------------------------------ |
| `hero.mp4`        | 5.4 MB | h.264, silent, 21.1s. The universal fallback.                 |
| `hero.webm`       | 2.5 MB | VP9, same cut. Listed first — browsers that can take it, do.  |
| `hero-poster.jpg` |  12 KB | Frame 0 exactly, so first paint never flashes.                |
| `og.jpg`          |  67 KB | Social share card — the rooftop gathering, not the dark moon. |

## What was cut, and why

The source needed four repairs before it could loop full-bleed behind text.

| Source range      | Problem                                              | Fix     |
| ----------------- | ---------------------------------------------------- | ------- |
| `0 → 3.733s`      | Burned-in red "बैठक / BAITHAK" title card             | dropped |
| `3.733 → 15.433s` | Pillarboxed to 886×498 inside the 16:9 frame          | cropped to its content box and upscaled |
| `15.433 → 17.4s`  | 2.0s of pure black — reads as a broken video in a loop | dropped |
| `26.9 → 32.8s`    | Large desaturated picture-in-picture panel overlay    | dropped |

The aspect change is the subtle one: the first half of the edit sits in a
~5:4 window inside the 16:9 frame, the second half fills it. Left alone, the
hero visibly changes size 12 seconds in. Cropping the first half to 16:9 and
upscaling costs some sharpness, but the browser already upscales this 720p
source to fill a 1920px viewport, so both halves end up equally soft — and it
is full-bleed throughout.

Audio is stripped (`-an`): the hero is a silent loop, the only kind browsers
reliably autoplay. The last 0.5s fades to black and frame 0 is the dark moon,
so the loop seam is black-into-dark and effectively invisible.

## Rebuilding

```sh
SRC='…/BAITHAK,25......#vadodara #purnima #garba.mp4'

ffmpeg -y -i "$SRC" -an -filter_complex "
[0:v]trim=start=3.733:end=15.433,setpts=PTS-STARTPTS,crop=886:498:196:111,scale=1278:720:flags=lanczos[segA];
[0:v]trim=start=17.400:end=26.800,setpts=PTS-STARTPTS[segB];
[segA][segB]concat=n=2:v=1:a=0[cat];
[cat]fade=t=out:st=20.6:d=0.5,format=yuv420p[out]" \
  -map "[out]" -c:v libx264 -crf 21 -preset slow -movflags +faststart hero.mp4

ffmpeg -y -i hero.mp4 -an -c:v libvpx-vp9 -crf 33 -b:v 0 \
  -row-mt 1 -deadline good -cpu-used 2 hero.webm

ffmpeg -y -i hero.mp4 -frames:v 1 -q:v 3 hero-poster.jpg
ffmpeg -y -ss 18.3 -i hero.mp4 -frames:v 1 -vf scale=1200:-2 -q:v 3 og.jpg
```

Useful when re-cutting:

```sh
# find shot boundaries
ffmpeg -i in.mp4 -filter:v "select='gt(scene,0.2)',metadata=print" -an -f null -
# find pillarboxing, per shot
ffmpeg -ss T -t 0.8 -i in.mp4 -vf cropdetect=limit=20:round=2:reset=1 -f null -
# find black gaps
ffmpeg -i in.mp4 -vf blackdetect=d=0.15:pic_th=0.96 -an -f null -
```

To swap in different footage, replace these files — or pass URLs straight to
the component and skip `public/` altogether:

```astro
<HeroVideo mp4="https://…/hero.mp4" poster="https://…/poster.jpg" />
```

Keep the mp4 under ~8 MB; the whole Vercel deployment is capped at 100 MB.
