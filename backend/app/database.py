from flask import g
from .models import SessionLocal

def get_db():
    if 'db' not in g:
        g.db = SessionLocal()
    return g.db

def teardown_db(exception):
    db = g.pop('db', None)
    if db is not None:
        db.close()
