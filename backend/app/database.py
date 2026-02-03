from flask import g
from flask_sqlalchemy import SQLAlchemy
from .models import SessionLocal

db = SQLAlchemy()

def get_db():
    if 'db' not in g:
        g.db = SessionLocal()
    return g.db

def teardown_db(exception):
    db_sess = g.pop('db', None)
    if db_sess is not None:
        db_sess.close()
