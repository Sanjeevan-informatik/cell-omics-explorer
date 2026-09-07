"""Zero-dependency local server for CellOmics Explorer Studio."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os

ROOT = Path(__file__).resolve().parent
os.chdir(ROOT)
print("CellOmics Explorer Studio: http://127.0.0.1:8765")
ThreadingHTTPServer(("127.0.0.1", 8765), SimpleHTTPRequestHandler).serve_forever()
