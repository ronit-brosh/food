#!/Library/Frameworks/Python.framework/Versions/3.12/bin/python3.12
"""
Run from the project root:
  python scripts/sync_to_prod.py
"""
import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
os.chdir(os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.sync import sync_to_production

if __name__ == "__main__":
    print("🔄 Syncing local → production...")
    asyncio.run(sync_to_production())
    print("✅ Done")
