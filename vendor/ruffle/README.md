# Ruffle (Flash emulator)

This folder holds the self-hosted build of [Ruffle](https://ruffle.rs/), which
plays `.swf` games in the browser.

The files are **not committed** (they are about 30 MB). They are downloaded
automatically by the GitHub Pages workflow. To get them locally, run:

```sh
bash tools/fetch-ruffle.sh
```

If this folder is empty, the site loads the same Ruffle version from the
unpkg CDN instead (`components/player.js`), so Flash games still work online.
