from pydantic import BaseModel
from typing import List

class BookingCreate(BaseModel):
    customer_name: str
    customer_email: str
    show_id: int
    seats: List[str]
