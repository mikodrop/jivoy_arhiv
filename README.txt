Живой Архив — статический демо‑сайт (v2)

Contents:
- index.html — main
- archive.html — listing with search and autocomplete
- record.html — single record (loads by ?id=ID) with clickable transcript
- about.html, participate.html, contacts.html
- data.json — example records
- assets/, audio/ folders
- styles.css, script.js

How to run:
1. Run a local HTTP server in the site folder, e.g. `python -m http.server 8000` and open http://localhost:8000
2. Replace audio files and update data.json

Updates in v2:
- Clickable synchronized transcript with highlight
- Image modal viewer for gallery thumbnails
- Autocomplete search suggestions in archive
- Download button shown if interview consent allows it
