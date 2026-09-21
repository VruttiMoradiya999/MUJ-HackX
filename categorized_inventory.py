import os
import pandas as pd

KNOWN_BRANDS = [
    'Amul', 'Mother Dairy', 'Epigamia', 'Patanjali', 'Milkmaid', 'Nestle', 'Britannia', 
    'Aashirvaad', 'Tata Sampann', 'Tata', 'Fortune', 'Dhara', 'DiSano', 'Uttam', 
    'Lal Qilla', 'India Gate', 'Rajdhani', 'Bambino', 'Parle-G', 'Parle', 'Haldirams', 
    'Lays', 'Kurkure', 'Bingo', 'Doritos', 'Pringles', 'Sunfeast', 'Oreo', 'Cadbury',
    'Brooke Bond', 'Lipton', 'Nescafe', 'Bru', 'Horlicks', 'Complan', 'Rooh Afza', 
    'Real', 'Tropicana', 'Coca Cola', 'Pepsi', 'Thums Up', 'Sprite', 'Limca', 'Frooti',
    'Maaza', 'Minute Maid', 'Red Bull', 'Kinley', 'Aquafina', 'Harvest Gold', 'Bonn',
    '7 Days', 'MTR', 'MDH', 'Everest', 'Shan', 'Maggi', 'Catch', 'Kohinoor', 'Daawat',
    'Saffola', 'Sundrop', 'Gemini', 'Engine', 'Bailley', 'Bisleri', 'Society', 'Wagh Bakri',
    'Taj Mahal', 'Girnar', 'Paper Boat', 'Raw Pressery', 'Kissan', 'Nutella', 'Hersheys',
    'Kelloggs', 'Quaker', 'Chocos', 'Surf Excel', 'Ariel', 'Tide', 'Wheel', 'Comfort',
    'Rin', 'Ujala', 'Vanish', 'Lizol', 'Harpic', 'Domex', 'Mr Muscle', 'Dettol', 'Nina',
    'Colin', 'Good Knight', 'All Out', 'Odonil', 'Air Wick', 'HIT', 'Mortein', 'Nimwash',
    'Ezee', 'Vim', 'Pril', 'Scotch Brite', 'Exo', '3M', 'Duracell', 'Eveready', 'Cello',
    'Ziploc', 'Reynolds', 'Nataraj', 'Prym', 'Dove', 'Pears', 'Fiama', 'Himalaya',
    'Lifebuoy', 'Santoor', 'Lux', 'Medimix', 'Pantene', 'Head Shoulders', 'Clinic Plus',
    'Parachute', 'Bajaj', 'Livon', 'Tresemme', 'Loreal', 'Sunslik', 'Colgate', 'Pepsodent',
    'Sensodyne', 'Dabur', 'Oral B', 'Listerine', 'Closeup', 'Nivea', 'Ponds', 'Lakme',
    'Neutrogena', 'Garnier', 'Glow and Lovely', 'Vaseline', 'Biotique', 'Clean Clear',
    'Gillette', 'Bombay Shaving Co', 'Park Avenue', 'Beardo', 'Veet', 'Old Spice', 'Axe'
]

def extract_brand_and_type(row):
    name = row['product_name']
    subcat = row['subcategory']
    name_clean = name.lower()
    
    brand = 'Other'
    for b in sorted(KNOWN_BRANDS, key=len, reverse=True):
        if name.lower().startswith(b.lower()) or (' ' + b.lower() + ' ') in (' ' + name_clean + ' '):
            brand = b
            break
    if brand == 'Other':
        brand = name.split()[0]
        
    ptype = 'General'
    if subcat == 'Dairy':
        if 'milk' in name_clean and 'condensed' not in name_clean and 'buttermilk' not in name_clean:
            ptype = 'Milk'
        elif 'paneer' in name_clean:
            ptype = 'Paneer'
        elif 'butter' in name_clean and 'buttermilk' not in name_clean:
            ptype = 'Butter'
        elif 'ghee' in name_clean:
            ptype = 'Ghee'
        elif 'cheese' in name_clean:
            ptype = 'Cheese'
        elif 'dahi' in name_clean or 'yogurt' in name_clean:
            ptype = 'Dahi & Yogurt'
        elif 'lassi' in name_clean or 'buttermilk' in name_clean:
            ptype = 'Lassi & Buttermilk'
        elif 'condensed' in name_clean:
            ptype = 'Condensed Milk'
        else:
            ptype = 'Dairy Specialty'
    elif subcat == 'Staples':
        if 'atta' in name_clean: ptype = 'Atta & Flour'
        elif 'rice' in name_clean: ptype = 'Rice'
        elif 'dal' in name_clean: ptype = 'Dals & Pulses'
        elif 'oil' in name_clean: ptype = 'Edible Oils'
        elif 'sugar' in name_clean: ptype = 'Sugar'
        elif 'salt' in name_clean: ptype = 'Salt'
        elif 'sooji' in name_clean or 'rava' in name_clean or 'besan' in name_clean or 'poha' in name_clean or 'vermicelli' in name_clean: ptype = 'Grains & Mixes'
        else: ptype = 'Staples Misc'
    else:
        ptype = subcat

    return pd.Series({'brand': brand, 'product_type': ptype})

def load_data():
    products = pd.read_csv("Data/products.csv")
    inventory = pd.read_csv("Data/inventory.csv")
    parsed = products.apply(extract_brand_and_type, axis=1)
    products['brand'] = parsed['brand']
    products['product_type'] = parsed['product_type']
    return pd.merge(products, inventory, on="product_id")

def show_dairy_hierarchy():
    df = load_data()
    dairy = df[df['subcategory'] == 'Dairy']
    
    print("=" * 90)
    print(" DAIRY CATEGORY: PRODUCT TYPE & BRAND BREAKDOWN (CSV DATA ONLY)")
    print("=" * 90)
    
    for ptype, pgroup in dairy.groupby('product_type'):
        ptype_stock = pgroup['stock_level'].sum()
        print(f"\n🥛 PRODUCT TYPE: {ptype.upper()} (Total: {ptype_stock:,} units)")
        print("-" * 75)
        for brand, bgroup in pgroup.groupby('brand'):
            brand_stock = bgroup['stock_level'].sum()
            print(f"  🏷️ Brand: {brand:<15} | Total Brand Stock: {brand_stock:,} units")
            for _, item in bgroup.iterrows():
                print(f"     • SKU #{item['product_id']:<3} | {item['product_name']:<35} | {item['stock_level']:>4} {item['unit_of_measure']:<6} | ₹{item['unit_price']:<6.2f}")

if __name__ == "__main__":
    show_dairy_hierarchy()
