#!/usr/bin/env python3
"""Cron job: fetch latest PM2.5 series from OpenAQ, run Holt's double
exponential smoothing, write public/forecast.json for the static site.
Pure stdlib + urllib — no pip dependencies."""
import json
import math
import os
import urllib.request

LAT, LNG = 12.97, 77.59  # default: Bengaluru; override via env
BASE = "https://api.openaq.org/v3"


def fetch_series(lat: float, lng: float, api_key: str | None) -> list[float]:
    url = f"{BASE}/locations?coordinates={lat},{lng}&radius=25000&limit=1"
    req = urllib.request.Request(url)
    if api_key:
        req.add_header("X-API-Key", api_key)
    with urllib.request.urlopen(req, timeout=30) as res:
        data = json.load(res)
    # Hourly-ish series from recent measurements
    series = [
        m["value"]
        for r in data.get("results", [])
        for m in r.get("measurements", [])
        if m.get("parameter") == "pm25"
    ]
    return series


def holt(series: list[float], horizon: int, alpha: float = 0.6, beta: float = 0.2) -> list[float]:
    if len(series) < 2:
        return [series[0] if series else 0.0] * horizon
    level, trend = series[0], series[1] - series[0]
    for x in series[1:]:
        prev = level
        level = alpha * x + (1 - alpha) * (level + trend)
        trend = beta * (level - prev) + (1 - beta) * trend
    return [max(0.0, level + (h + 1) * trend) for h in range(horizon)]


def main() -> None:
    lat = float(os.environ.get("AQI_LAT", LAT))
    lng = float(os.environ.get("AQI_LNG", LNG))
    key = os.environ.get("OPENAQ_API_KEY")
    try:
        series = fetch_series(lat, lng, key)
    except Exception as exc:  # keep old file rather than failing the workflow
        print(f"fetch failed, keeping existing forecast.json: {exc}")
        return
    if len(series) < 3:
        print("insufficient data; keeping existing forecast.json")
        return
    forecast = holt(series, 24)
    out = {"generated_at": __import__("datetime").datetime.now().isoformat(), "history": series, "forecast": forecast}
    with open("public/forecast.json", "w") as f:
        json.dump(out, f)
    print(f"wrote {len(series)} history points, 24 forecast points")


if __name__ == "__main__":
    main()
