from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import date, timedelta, datetime
from sqlalchemy import func
import random
from uuid import uuid4
import qrcode, io, base64

from .database import Base, engine, get_db, SessionLocal
from . import models, schemas
from .ai_engine import recommend_movies, seat_scores, crowd_prediction, dynamic_price, seat_price

app = FastAPI(title="CINEVERSE AI API", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
Base.metadata.create_all(bind=engine)

MOVIES = [
    ("The Last Horizon","Sci-Fi • Adventure","English","U/A 13+","2h 18m","A daring crew travels beyond known space to uncover a signal that could change humanity's future.","https://image.tmdb.org/t/p/w500/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg"),
    ("Shadow Protocol","Action • Thriller","Tamil","U/A 16+","2h 06m","An undercover agent has one night to stop a cyber threat before the city goes dark.","https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg"),
    ("Midnight in Paris","Romance • Drama","English","U","1h 54m","Two strangers meet on a rainy evening and discover that the city has plans for them.","https://image.tmdb.org/t/p/w500/5kiLS9nsS9aJ2YRjXUwJ2vlesm6.jpg"),
    ("Kingdom of Ash","Fantasy • Action","Tamil","U/A 13+","2h 24m","A forgotten heir returns to a kingdom divided by secrets and an ancient prophecy.","https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg"),
    ("The Silent Signal","Mystery • Thriller","English","U/A 16+","1h 49m","A radio host receives a transmission that predicts events minutes before they happen.","https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg"),
    ("Neon Streets","Crime • Drama","Tamil","A","2h 02m","A detective follows a trail of clues through a neon-lit underground city.","https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg"),
]
SCORES = {"The Last Horizon":8.8,"Shadow Protocol":8.7,"Midnight in Paris":8.6,"Kingdom of Ash":8.5,"The Silent Signal":8.4,"Neon Streets":8.3}  # demo scores
THEATRES = [("CineMax Grand","Anna Nagar"),("Galaxy Cinemas","Velachery"),("PVR Luxe","Phoenix Marketcity")]

def seed():
    db = SessionLocal()
    try:
        if db.query(models.Movie).count() == 0:
            for x in MOVIES:
                db.add(models.Movie(title=x[0],genre=x[1],language=x[2],rating=x[3],duration=x[4],description=x[5],poster=x[6]))
            db.commit()
        if db.query(models.Theatre).count() == 0:
            for name, loc in THEATRES:
                db.add(models.Theatre(name=name,location=loc))
            db.commit()
        all_movies = db.query(models.Movie).all()
        all_theatres = db.query(models.Theatre).all()
        for day_offset in range(8):
            day = (date.today()+timedelta(days=day_offset)).isoformat()
            if db.query(models.Show).filter_by(show_date=day).count() == 0:
                for movie in all_movies:
                    for theatre in all_theatres:
                        for idx, time in enumerate(["10:30 AM","01:45 PM","06:30 PM","09:45 PM"]):
                            db.add(models.Show(movie_id=movie.id,theatre_id=theatre.id,show_date=day,show_time=time,base_price=180+idx*40))
                db.commit()
    finally:
        db.close()
def seed_bookings():
    """Demo bookings so the dashboard, charts and 3D hall have realistic data."""
    db = SessionLocal()
    try:
        if db.query(models.Booking).count(): return
        rnd = random.Random(7)
        names = [f"{r}{n}" for r in "ABCDEF" for n in range(1, 9)]
        for s in rnd.sample(db.query(models.Show).all(), 260):
            free = names[:]; rnd.shuffle(free); left = rnd.randint(8, 34)
            while left > 0 and free:
                k = min(rnd.randint(1, 4), left, len(free)); picked = [free.pop() for _ in range(k)]; left -= k
                b = models.Booking(booking_code="CINE-" + uuid4().hex[:8].upper(), customer_name="Demo User",
                    customer_email=f"user{rnd.randint(1, 140)}@demo.in", show_id=s.id, seats=",".join(picked),
                    total=sum(seat_price(s.base_price, x)["price"] for x in picked), status="CONFIRMED",
                    created_at=datetime.utcnow() - timedelta(days=int(rnd.triangular(0, 365, 5)), hours=rnd.randint(0, 23)))
                db.add(b); db.flush()
                for x in picked: db.add(models.BookedSeat(show_id=s.id, seat=x, booking_id=b.id))
        db.commit()
    finally:
        db.close()
seed(); seed_bookings()

@app.get("/")
def root():
    return {"message":"CINEVERSE AI API is running","version":"2.0.0"}

@app.get("/api/movies")
def movies(db: Session=Depends(get_db)):
    return [{"id":x.id,"title":x.title,"genre":x.genre,"language":x.language,"rating":x.rating,"duration":x.duration,
             "description":x.description,"poster":x.poster,"score":SCORES.get(x.title,8.0)} for x in db.query(models.Movie).all()]

@app.get("/api/ai/recommendations")
def recommendations(genre: str="", language: str="", db: Session=Depends(get_db)):
    return {"recommendations":recommend_movies(db.query(models.Movie).all(),genre,language)}

@app.get("/api/theatres")
def theatres(db: Session=Depends(get_db)):
    return db.query(models.Theatre).all()

@app.get("/api/shows")
def shows(movie_id: int, show_date: str, db: Session=Depends(get_db)):
    rows=db.query(models.Show).filter_by(movie_id=movie_id,show_date=show_date).all()
    output=[]
    for s in rows:
        count=db.query(models.BookedSeat).filter_by(show_id=s.id).count()
        crowd=crowd_prediction(s.show_time,s.show_date,count)
        price=dynamic_price(s.base_price,crowd["occupancy_percent"])
        output.append({"id":s.id,"movie_id":s.movie_id,"theatre_id":s.theatre_id,
          "theatre_name":s.theatre.name,"location":s.theatre.location,"show_date":s.show_date,
          "show_time":s.show_time,"price":price["suggested_price"],"base_price":s.base_price,
          "crowd":crowd,"pricing":price})
    return output

@app.get("/api/shows/{show_id}/seats")
def seats(show_id: int, db: Session=Depends(get_db)):
    show=db.get(models.Show,show_id)
    if not show: raise HTTPException(404,"Show not found")
    booked=[x[0] for x in db.query(models.BookedSeat.seat).filter_by(show_id=show_id).all()]
    ranked=seat_scores()
    for item in ranked: item["booked"]=item["seat"] in booked
    crowd=crowd_prediction(show.show_time,show.show_date,len(booked))
    base=dynamic_price(show.base_price,crowd["occupancy_percent"])["suggested_price"]
    prices={x["seat"]:seat_price(base,x["seat"]) for x in ranked}
    return {"booked":booked,"rows":list("ABCDEF"),"seats_per_row":8,"prices":prices,"show_price":base,
            "recommendations":[x for x in ranked if not x["booked"]][:5]}

@app.post("/api/bookings")
def create_booking(payload: schemas.BookingCreate, db: Session=Depends(get_db)):
    if not payload.customer_name.strip() or "@" not in payload.customer_email:
        raise HTTPException(400,"Enter a valid name and email")
    if not payload.seats: raise HTTPException(400,"Select at least one seat")
    if len(set(payload.seats)) != len(payload.seats): raise HTTPException(400,"Duplicate seats")
    show=db.get(models.Show,payload.show_id)
    if not show: raise HTTPException(404,"Show not found")
    allowed={f"{r}{n}" for r in "ABCDEF" for n in range(1,9)}
    if not set(payload.seats).issubset(allowed): raise HTTPException(400,"Invalid seat")
    taken=db.query(models.BookedSeat).filter(models.BookedSeat.show_id==show.id,models.BookedSeat.seat.in_(payload.seats)).first()
    if taken: raise HTTPException(409,f"Seat {taken.seat} is already booked")
    count=db.query(models.BookedSeat).filter_by(show_id=show.id).count()
    crowd=crowd_prediction(show.show_time,show.show_date,count)
    price=dynamic_price(show.base_price,crowd["occupancy_percent"])["suggested_price"]
    total=sum(seat_price(price,x)["price"] for x in payload.seats)
    code="CINE-"+uuid4().hex[:8].upper()
    booking=models.Booking(booking_code=code,customer_name=payload.customer_name.strip(),
        customer_email=payload.customer_email.strip(),show_id=show.id,seats=",".join(payload.seats),
        total=total,status="CONFIRMED")
    db.add(booking); db.flush()
    for seat in payload.seats: db.add(models.BookedSeat(show_id=show.id,seat=seat,booking_id=booking.id))
    try: db.commit()
    except IntegrityError:
        db.rollback(); raise HTTPException(409,"A seat was just booked. Refresh and try again.")
    db.refresh(booking)
    return {"id":booking.id,"booking_code":code,"seats":booking.seats,"total":booking.total,"status":booking.status}

@app.get("/api/bookings")
def bookings(email: str, db: Session=Depends(get_db)):
    rows=db.query(models.Booking).filter_by(customer_email=email).order_by(models.Booking.id.desc()).all()
    return [{"booking_code":b.booking_code,"seats":b.seats,"total":b.total,"status":b.status,
      "show_date":b.show.show_date,"show_time":b.show.show_time,"movie_title":b.show.movie.title,
      "theatre_name":b.show.theatre.name} for b in rows]

@app.get("/api/bookings/{code}/qr")
def qr_ticket(code: str, db: Session=Depends(get_db)):
    b=db.query(models.Booking).filter_by(booking_code=code).first()
    if not b: raise HTTPException(404,"Booking not found")
    image=qrcode.make(f"CINEVERSE|{b.booking_code}|{b.seats}|{b.total}")
    buf=io.BytesIO(); image.save(buf,format="PNG")
    return {"qr":"data:image/png;base64,"+base64.b64encode(buf.getvalue()).decode()}

@app.get("/api/admin/analytics")
def analytics(db: Session=Depends(get_db)):
    all_bookings=db.query(models.Booking).all()
    revenue=sum(b.total for b in all_bookings)
    movie_counts={}
    for b in all_bookings:
        title=b.show.movie.title
        movie_counts[title]=movie_counts.get(title,0)+len(b.seats.split(","))
    popular=sorted([{"movie":k,"tickets":v} for k,v in movie_counts.items()],key=lambda x:x["tickets"],reverse=True)
    return {"total_bookings":len(all_bookings),"tickets_sold":sum(len(b.seats.split(",")) for b in all_bookings),
      "demo_revenue":round(revenue,2),"popular_movies":popular,"booking_status":"Demo data"}

@app.get("/api/admin/shows")
def admin_shows(db: Session=Depends(get_db)):
    result=[]
    for s in db.query(models.Show).filter(models.Show.show_date>=date.today().isoformat()).limit(30).all():
        booked=db.query(models.BookedSeat).filter_by(show_id=s.id).count()
        crowd=crowd_prediction(s.show_time,s.show_date,booked)
        result.append({"show_id":s.id,"movie":s.movie.title,"theatre":s.theatre.name,"date":s.show_date,
          "time":s.show_time,"booked":booked,"capacity":48,"crowd":crowd["crowd_level"],"occupancy":crowd["occupancy_percent"]})
    return result


@app.get("/api/admin/dashboard")
def dashboard(range_param: str = Query("7d", alias="range"), db: Session = Depends(get_db)):
    now = datetime.utcnow()
    bs = db.query(models.Booking).all()
    win = lambda lo, hi: [b for b in bs if lo <= (now - b.created_at).days < hi]
    kinds = {"bookings": len, "revenue": lambda L: round(sum(b.total for b in L)), "users": lambda L: len({b.customer_email for b in L})}
    stats = {}
    for k, f in kinds.items():
        cur, prev = f(win(0, 7)), f(win(7, 14))
        stats[k] = {"value": f(bs), "change": round((cur - prev) / prev * 100, 1) if prev else 0, "spark": [f(win(d, d + 1)) for d in range(13, -1, -1)]}
    stats["theatres"] = {"value": db.query(models.Theatre).count(), "change": 0, "spark": [1] * 14}
    size, n = {"7d": (1, 7), "30d": (3, 10), "3m": (7, 12), "1y": (30, 12)}.get(range_param, (1, 7))
    labels, values = [], []
    for i in range(n - 1, -1, -1):
        end = now - timedelta(days=i * size)
        labels.append(end.strftime("%a") if size == 1 else end.strftime("%b") if size == 30 else end.strftime("%d %b"))
        values.append(len(win(i * size, (i + 1) * size)))
    rows = db.query(models.Show.show_date, func.count(models.BookedSeat.id)).join(models.BookedSeat, models.BookedSeat.show_id == models.Show.id).group_by(models.Show.show_date).all()
    byday = {}
    for d, c in rows:
        name = date.fromisoformat(d).strftime("%A")
        byday[name] = byday.get(name, 0) + c
    insight = None
    if byday:
        avg = sum(byday.values()) / len(byday)
        best = max(byday, key=byday.get)
        insight = {"day": best, "percent": round((byday[best] / avg - 1) * 100)} if avg else None
    counts = dict(db.query(models.BookedSeat.show_id, func.count(models.BookedSeat.id)).group_by(models.BookedSeat.show_id).all())
    slots = {}
    for s in db.query(models.Show).filter_by(show_date=date.today().isoformat()).all():
        slots.setdefault(s.show_time, []).append(crowd_prediction(s.show_time, s.show_date, counts.get(s.id, 0))["occupancy_percent"])
    slot_list = [{"time": t, "percent": round(sum(v) / len(v))} for t, v in slots.items() if v]
    peak = max([x["percent"] for x in slot_list], default=0)
    return {"stats": stats, "series": {"labels": labels, "values": values}, "insight": insight,
            "crowd": {"level": "High" if peak >= 70 else "Moderate" if peak >= 42 else "Low", "slots": slot_list}}
