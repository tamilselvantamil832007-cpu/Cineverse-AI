from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class Movie(Base):
    __tablename__ = "movies"
    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    genre = Column(String, nullable=False)
    language = Column(String, nullable=False)
    rating = Column(String, nullable=False)
    duration = Column(String, nullable=False)
    description = Column(String, nullable=False)
    poster = Column(String, nullable=False)

class Theatre(Base):
    __tablename__ = "theatres"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    location = Column(String, nullable=False)

class Show(Base):
    __tablename__ = "shows"
    id = Column(Integer, primary_key=True)
    movie_id = Column(Integer, ForeignKey("movies.id"), nullable=False)
    theatre_id = Column(Integer, ForeignKey("theatres.id"), nullable=False)
    show_date = Column(String, nullable=False)
    show_time = Column(String, nullable=False)
    base_price = Column(Float, nullable=False)
    movie = relationship("Movie")
    theatre = relationship("Theatre")

class Booking(Base):
    __tablename__ = "bookings"
    id = Column(Integer, primary_key=True)
    booking_code = Column(String, unique=True, nullable=False)
    customer_name = Column(String, nullable=False)
    customer_email = Column(String, nullable=False, index=True)
    show_id = Column(Integer, ForeignKey("shows.id"), nullable=False)
    seats = Column(String, nullable=False)
    total = Column(Float, nullable=False)
    status = Column(String, default="CONFIRMED")
    created_at = Column(DateTime, default=datetime.utcnow)
    show = relationship("Show")

class BookedSeat(Base):
    __tablename__ = "booked_seats"
    id = Column(Integer, primary_key=True)
    show_id = Column(Integer, ForeignKey("shows.id"), nullable=False)
    seat = Column(String, nullable=False)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    __table_args__ = (UniqueConstraint("show_id", "seat", name="uq_show_seat"),)
