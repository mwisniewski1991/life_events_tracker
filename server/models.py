from . import db

class Categories(db.Model):
    '''
    idd: 'work'
    name: 'Work'
    created_date: format 'yyyy-mm-dd'
        information when category has been started to monitor
    '''
    __tablename__ = 'Categories'
    idd = db.Column('category_idd', db.String(50), primary_key = True)
    name = db.Column('name', db.String(50))
    created_date = db.Column('created_date', db.String(10)) #yyyy-mm-dd

class Actions(db.Model):
    '''
    idd: 'home_office'
    name: example 'Home office'
    created_date: format 'yyyy-mm-dd'
        information when actions has been started to monitor
    category_idd: foreign_key from category table example: 'work'
    '''
    __tablename__ = 'Actions'
    idd = db.Column('idd', db.String(50), primary_key = True)
    name = db.Column('name', db.String(50))
    created_date = db.Column('created_date', db.String(10)) #yyyy-mm-dd
    category_idd = db.Column('category_idd', db.String(50), db.ForeignKey(Categories.idd))

class Actions_events(db.Model):
    ''''
    idd: concatenate: category_id_action_id_date_time
    category_idd: foreign_key from category table example: 'work'
    action_idd: foreign_key from actions table example: 'home_office'
    date_time: format yyyy-mm-dd_hh:mm
    '''
    __tablename__ = 'Actions_events'
    idd = db.Column('idd', db.Integer, primary_key = True) 
    category_idd = db.Column('category_idd', db.String(50), db.ForeignKey(Actions.idd)) 
    action_idd = db.Column('action_idd', db.String(50), db.ForeignKey(Categories.idd))
    date_time = db.Column('date_time', db.String(16)) #yyyy-mm-dd-hh:mm