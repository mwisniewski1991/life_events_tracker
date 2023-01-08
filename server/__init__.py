from flask import Flask
from flask_sqlalchemy import SQLAlchemy

DB_PATH = 'database.sqlite'
db = SQLAlchemy()

def create_app() -> Flask:
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{DB_PATH}'
    db.init_app(app)

    from .views import views
    app.register_blueprint(views, url_prefix='/')

    return app