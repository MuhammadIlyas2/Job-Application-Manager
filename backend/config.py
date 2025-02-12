import os
import secrets

class Config:
    SECRET_KEY = secrets.token_hex(32)
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'mysql+pymysql://root:ChessFun%402@localhost/jam_db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False