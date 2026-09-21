import os
import json
import urllib.request
import urllib.parse
import re
import pandas as pd
from concurrent.futures import ThreadPoolExecutor, as_completed

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "Data")
CACHE_FILE = os.path.join(DATA_DIR, "product_images.json")

def search_product_image(product_name: str) -> str:
    query = f"{product_name} product pack white background"
    url = 'https://www.bing.com/images/search?q=' + urllib.parse.quote(query) + '&FORM=HDRSC2'
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    })
    try:
        with urllib.request.urlopen(req, timeout=6) as r:
            html = r.read().decode('utf-8', errors='ignore')
            matches = re.findall(r'&quot;murl&quot;:&quot;(https?://[^&]+)&quot;', html)
            if matches:
                return matches[0]
            matches2 = re.findall(r'murl&quot;:&quot;(http[^&]+)&quot;', html)
            if matches2:
                return matches2[0]
    except Exception as e:
        pass
    return ""

def load_cached_images() -> dict:
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_cached_images(images_dict: dict):
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(images_dict, f, indent=2)

def run_image_enrichment():
    products_csv = os.path.join(DATA_DIR, "products.csv")
    df = pd.read_csv(products_csv)
    cached = load_cached_images()
    
    missing = []
    for _, row in df.iterrows():
        pid = str(row["product_id"])
        if pid not in cached or not cached[pid]:
            missing.append((pid, row["product_name"]))
            
    print(f"Total products: {len(df)}, Cached: {len(cached)}, Fetching missing: {len(missing)}...")
    
    if not missing:
        print("All product images are already cached!")
        return cached
        
    def fetch_item(item):
        pid, name = item
        img_url = search_product_image(name)
        return pid, img_url
        
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(fetch_item, item) for item in missing]
        count = 0
        for future in as_completed(futures):
            pid, img_url = future.result()
            if img_url:
                cached[pid] = img_url
            count += 1
            if count % 20 == 0 or count == len(missing):
                print(f"Progress: {count}/{len(missing)} images processed...")
                save_cached_images(cached)
                
    save_cached_images(cached)
    print(f"Image enrichment complete! Total cached: {len(cached)}")
    return cached

if __name__ == "__main__":
    run_image_enrichment()
