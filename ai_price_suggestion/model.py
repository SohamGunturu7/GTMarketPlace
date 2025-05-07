def suggest_price(title: str, description: str, category: str) -> float:
    # Dummy heuristic: base price by category
    base_prices = {
        'Electronics': 100.0,
        'Books': 15.0,
        'Furniture': 50.0,
        'Clothing': 20.0,
        'Other': 30.0
    }
    base = base_prices.get(category, 30.0)
    # Add a little based on description length
    bonus = min(len(description) * 0.2, 40)
    # Add a little for certain keywords
    keywords = ['new', 'sealed', 'unopened', 'latest']
    if any(word in description.lower() for word in keywords):
        base += 20
    return round(base + bonus, 2) 