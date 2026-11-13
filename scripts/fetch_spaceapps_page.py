#!/usr/bin/env python3
"""Print the text of a spaceappschallenge.org page (challenge tabs, guides, FAQ).

Why this exists: the site's server sends an incomplete certificate chain, so plain
`curl` fails in build containers, and the page text sits in Next.js script chunks,
not in the visible HTML. This script completes the chain with the certificate
authority's own published intermediate (verification stays on) and prints the text.
Details: docs/research/official-resources.md.

Usage:
  python3 scripts/fetch_spaceapps_page.py "https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/?tab=resources"
  python3 scripts/fetch_spaceapps_page.py URL --raw   # every text chunk, unfiltered
"""
import html
import json
import os
import re
import ssl
import subprocess
import sys
import tempfile
from html.parser import HTMLParser

INTERMEDIATE = "http://cert.ssl.com/SSL.com-TLS-I-RSA-R1.cer"  # from the site certificate's AIA field
AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"


def curl(url, *extra):
    done = subprocess.run(["curl", "-sS", "-L", "--max-time", "90", "-A", AGENT, *extra, url], capture_output=True)
    return done.returncode, done.stdout, done.stderr.decode(errors="replace")


def base_bundle():
    for name in ("CURL_CA_BUNDLE", "SSL_CERT_FILE", "REQUESTS_CA_BUNDLE"):
        path = os.environ.get(name)
        if path and os.path.exists(path):
            return path
    for path in ("/etc/ssl/certs/ca-certificates.crt", "/etc/ssl/cert.pem"):
        if os.path.exists(path):
            return path
    sys.exit("No CA bundle found.")


def fetch(url):
    code, body, err = curl(url)
    if code == 0 and body:
        return body
    if code != 60:  # 60 = certificate problem; anything else is a different fault
        sys.exit(f"curl failed ({code}): {err.strip()}")
    code, der, err = curl(INTERMEDIATE)
    if code != 0 or not der:
        sys.exit(f"Could not download the intermediate certificate: {err.strip()}")
    pem = ssl.DER_cert_to_PEM_cert(der)
    with tempfile.NamedTemporaryFile("w", suffix=".pem", delete=False) as bundle:
        bundle.write(open(base_bundle(), encoding="utf-8", errors="replace").read())
        bundle.write("\n" + pem)
    try:
        code, body, err = curl(url, "--cacert", bundle.name)
    finally:
        os.unlink(bundle.name)
    if code != 0 or not body:
        sys.exit(f"curl failed with the completed chain ({code}): {err.strip()}")
    return body


class Text(HTMLParser):
    def __init__(self):
        super().__init__()
        self.out = []
        self.href = None

    def handle_starttag(self, tag, attrs):
        if tag == "a":
            self.href = dict(attrs).get("href")
        if tag in ("p", "li", "h1", "h2", "h3", "h4", "br", "ul"):
            self.out.append("\n")
        if tag == "li":
            self.out.append("- ")

    def handle_endtag(self, tag):
        if tag == "a" and self.href:
            self.out.append(f" <{self.href}>")
            self.href = None

    def handle_data(self, data):
        self.out.append(data)


def page_text(page, raw):
    chunks = re.findall(r'self\.__next_f\.push\(\[1,(".*?")\]\)</script>', page, re.S)
    payload = ""
    for chunk in chunks:
        try:
            payload += json.loads(chunk)
        except ValueError:
            pass
    payload = (payload.replace("\\u003c", "<").replace("\\u003e", ">").replace("\\u0026", "&")
               .replace('\\"', '"').replace("\\n", "\n"))
    parser = Text()
    parser.feed(payload)
    lines = [html.unescape(line.strip()) for line in "".join(parser.out).split("\n")]
    if raw:
        return "\n".join(line for line in lines if line)
    keep, seen = [], set()
    for line in lines:
        line = re.sub(r'[0-9a-f]{1,3}:\[\[?"\$".*$', "", line)   # trailing framework data
        line = re.sub(r'"\}[\],\{].*$', "", line)
        line = re.sub(r"[0-9a-f]{1,3}:T[0-9a-f]+,$", "", line).strip()
        if len(line) < 3 or line in seen or "__typename" in line[:300]:
            continue
        if line.startswith(("{", "[", '"', ":HL")) or re.match(r"^[0-9a-f]{1,3}:(I\[|\[|\{)", line):
            continue
        seen.add(line)
        keep.append(line)
    return "\n".join(keep)


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a != "--raw"]
    if len(args) != 1 or "spaceappschallenge.org" not in args[0]:
        sys.exit(__doc__)
    print(page_text(fetch(args[0]).decode("utf-8", errors="replace"), "--raw" in sys.argv))
