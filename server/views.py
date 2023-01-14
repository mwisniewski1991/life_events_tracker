from flask import Blueprint, send_from_directory, request
from datetime import datetime
from . import db
from .models import Categories, Actions, Events

views = Blueprint('views', __name__)

def check_actions_events_exist(action_idd: str, date: str) -> bool:
    '''
    Checking if actions has been after date.
    
    action_idd: example 'office'
    date: format yyyy-mm-dd, checking db for higher values
    '''
    result = db.session.query(Events.idd).filter(db.and_(Events.action_idd == action_idd, Events.created_datetime >= date))
    for row in result:
        if row:
            return True
    return False

def read_category_for_action(action_idd: str) -> str:
    '''
    Check category for specific action:
    action_idd: example 'office'
    '''
    result = db.session.query(Actions.category_idd).filter(Actions.idd == action_idd).scalar()
    return result

def add_action(category_idd:str, action_idd:str, created_date:str):
    new_action = Events(category_idd=category_idd, action_idd=action_idd, created_datetime=created_date)

    db.session.add(new_action)
    db.session.commit()

def get_events_idd(category_idd:str, action_idd:str, created_date:str) -> None:
    result:str = db.session.query(Events.idd).filter(db.and_(
        Events.category_idd==category_idd,
        Events.action_idd == action_idd,
        Events.created_datetime == created_date,
        )).scalar()
    return result

def delete_action(event_idd: str) -> None:
    db.session.query(Events).filter(Events.idd == event_idd).delete()
    db.session.commit()
    return{
        'status': 'success'
    }


# Path for our main Svelte page
@views.route("/")
def base():
    return send_from_directory('../frontend/public', 'index.html')

# Path for all the static files (compiled JS/CSS, etc.)
@views.route("/<path:path>")
def home(path):
    return send_from_directory('../frontend/public', path)

@views.route('/actions_list', methods=['GET'])
def get_actions_list():
    
    result: list[dict] = []
    today: str = datetime.today().strftime('%Y-%m-%d')

    categories_result = db.session.query(Categories).all()
    for category in categories_result:
        category_object: dict = {}
        
        category_object['idd'] = category.idd
        category_object['name'] = category.name
        category_object['actions_list'] = []

        actions_result = db.session.query(Actions).filter(Actions.category_idd == category.idd)
        for action in actions_result:
            event_posted_today = bool(db.session.query(Events.idd).filter(db.and_(Events.action_idd == action.idd, Events.created_datetime >= today)).scalar())
            
            actions_object = {}
            actions_object['action_idd'] = action.idd
            actions_object['action_name'] = action.name
            actions_object['posted_today'] = event_posted_today

            category_object['actions_list'].append(actions_object)

        result.append(category_object)
    return result


@views.route('/event-post', methods=['POST'])
def post_action_into_db() -> dict:
    action_idd:str = request.args['action-idd']
    today: str = datetime.today().strftime('%Y-%m-%d')

    actions_events_existed: bool  = check_actions_events_exist(action_idd, today)

    if actions_events_existed:
        return {'posted_id': action_idd,'actions_events_existed' : actions_events_existed, 'posted': False}
    
    else:
        category_idd: str = read_category_for_action(action_idd)
        created_date: str = datetime.now().strftime('%Y-%m-%d %H:%M')
        
        add_action(category_idd, action_idd, created_date)
        events_idd:int = get_events_idd(category_idd, action_idd, created_date)
        return {'posted_id': action_idd, 'existed': actions_events_existed, 'posted': True, 'events_idd': events_idd}


@views.route('/event-delete', methods=['POST'])
def delete_route() -> dict:
    event_idd:int = int(request.args['event-idd'])
    delete_action(event_idd)  
    return {'event_idd': event_idd, 'status': 'removed'}    