from collections import Counter
from datetime import date
import math

def tokens(text: str):
    return {part.strip().lower() for part in text.replace("•", " ").replace(",", " ").split() if part.strip()}

def recommend_movies(movies, preferred_genre=None, preferred_language=None, limit=4):
    genre_tokens = tokens(preferred_genre or "")
    ranked = []
    for movie in movies:
        movie_genres = tokens(movie.genre)
        genre_score = len(genre_tokens & movie_genres) / max(1, len(genre_tokens)) if genre_tokens else 0
        language_score = 1 if preferred_language and movie.language.lower() == preferred_language.lower() else 0
        rating_score = 0.15 if "u/a" in movie.rating.lower() else 0.08
        score = round(genre_score * 0.65 + language_score * 0.25 + rating_score, 3)
        ranked.append({
            "movie_id": movie.id, "title": movie.title, "genre": movie.genre,
            "language": movie.language, "poster": movie.poster, "score": score,
            "reason": "Matches your genre/language preferences" if genre_score or language_score else "Popular catalogue pick"
        })
    return sorted(ranked, key=lambda x: x["score"], reverse=True)[:limit]

def seat_scores(rows="ABCDEF", seats_per_row=8):
    result = []
    center = (seats_per_row + 1) / 2
    for row_index, row in enumerate(rows):
        for number in range(1, seats_per_row + 1):
            # Prefer middle rows and horizontally centered seats.
            horizontal = 1 - abs(number - center) / center
            vertical = 1 - abs(row_index - (len(rows)-2)) / max(1, len(rows))
            score = round(0.65 * horizontal + 0.35 * vertical, 3)
            result.append({"seat": f"{row}{number}", "score": score})
    return sorted(result, key=lambda x: x["score"], reverse=True)

def crowd_prediction(show_time: str, show_date: str, booked_count: int, capacity: int = 48):
    hour_text = show_time.split(":")[0]
    try:
        hour = int(hour_text)
    except ValueError:
        hour = 18
    time_factor = 0.72 if ("PM" in show_time and hour in (6, 7, 8, 9)) else 0.48
    try:
        weekend_factor = 0.12 if date.fromisoformat(show_date).weekday() >= 5 else 0
    except ValueError:
        weekend_factor = 0
    observed = booked_count / max(1, capacity)
    estimate = min(0.96, max(0.08, 0.18 + time_factor * 0.45 + weekend_factor + observed * 0.35))
    pct = round(estimate * 100)
    label = "High" if pct >= 70 else "Moderate" if pct >= 42 else "Low"
    return {"occupancy_percent": pct, "crowd_level": label, "capacity": capacity,
            "booked_seats": booked_count,
            "method": "Demo baseline using show time, weekend indicator and current bookings"}

def dynamic_price(base_price: float, occupancy_percent: int):
    # Demo-only transparent multiplier, capped at +20%.
    if occupancy_percent >= 80:
        multiplier = 1.20
    elif occupancy_percent >= 60:
        multiplier = 1.10
    elif occupancy_percent >= 35:
        multiplier = 1.05
    else:
        multiplier = 1.0
    return {"base_price": round(base_price, 2), "multiplier": multiplier,
            "suggested_price": round(base_price * multiplier, 2),
            "explanation": f"Demo demand multiplier {multiplier:.2f} based on estimated occupancy"}


# Row tiers: front rows cheaper, centre rows premium, last row recliner.
SEAT_TIERS = {"A": ("Front", 0.85), "B": ("Standard", 0.95), "C": ("Prime", 1.15),
              "D": ("Prime", 1.25), "E": ("Premium", 1.10), "F": ("Recliner", 1.45)}

def seat_price(show_price: float, seat: str):
    tier, row_mult = SEAT_TIERS[seat[0]]
    centre = 1.05 if 3 <= int(seat[1:]) <= 6 else 1.0
    mult = round(row_mult * centre, 3)
    return {"tier": tier, "multiplier": mult, "price": round(show_price * mult)}
