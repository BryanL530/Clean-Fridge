from dotenv import load_dotenv
import os, datetime, database, uuid, json, pathlib, requests, cachecontrol, google.auth.transport.requests, google.oauth2.id_token as id_token
from azure.cosmos.exceptions import CosmosHttpResponseError, CosmosResourceNotFoundError
from google_auth_oauthlib.flow import Flow

from flask import (Flask, redirect, render_template, request,
                   send_from_directory, url_for, session, abort)

app = Flask('Clean Fridge')
app.secret_key = 'Replace something here'

os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'
CLIENT_SECRET_FILE = os.path.join(pathlib.Path(__file__).parent, "client_secret.json")
redirect_uri = 'http://127.0.0.1:5000/callback'

if os.getenv("AZURE") is not None:
    redirect_uri = 'https://cleanfridge.azurewebsites.net/callback'


flow = Flow.from_client_secrets_file(client_secrets_file=CLIENT_SECRET_FILE,
                                     scopes=['https://www.googleapis.com/auth/userinfo.email',
                                             'https://www.googleapis.com/auth/userinfo.profile',
                                             'openid'],
                                     redirect_uri=redirect_uri)

#####################################################################################################
##########                               GENERAL FUNCTIONS                                 ##########
#####################################################################################################

@app.before_request
def activate_database():
    try:
        if database.storage is None or database.item is None or database.user is None:
            database.connect_database()
    except Exception:
        abort(502)

def login_required(function):
    def wrapper(*args, **kwargs):
        if any(required not in session for required in ['state', 'email', 'id']):
            print(f'User not loggined, redirect to login')
            return redirect('/login')
        else:
            print(f'Request for {function.__name__} recieved')
            print(f'User State: {session["state"]}')
            print(f'User Id: {session["id"]}')
            print(f'User Email: {session["email"]}')
            return function(*args, **kwargs)
    wrapper.__name__ = function.__name__
    return wrapper

def api_verification(function):
    def wrapper(*args, **kwargs):        
        if any(required not in session for required in ['state', 'email', 'id']):
            print(f'User not verified')
            return 'Unauthorized', 401
        else:
            print(f'Request for {function.__name__} recieved')
            print(f'User State: {session["state"]}')
            print(f'User Id: {session["id"]}')
            print(f'User Email: {session["email"]}')
            return function(*args, **kwargs)
    
    wrapper.__name__ = function.__name__
    return wrapper

def exception_handler(function):
    def wrapper(*args, **kwargs):
        try:
            return function(*args, **kwargs)
        except Exception as e:
            return '404', 404
    
    wrapper.__name__ = function.__name__
    return wrapper

#####################################################################################################
##########                               Webpage FUNCTIONS                                 ##########
#####################################################################################################

@app.route('/')
@login_required
def index():
    items = database.get_items_by_user(user_id=session['id'])
    pinned = database.get_pinned(session['id'])
    return render_template('index.html',
                           pinned_list=pinned,
                           item_list=items)

@app.route('/storage')
@login_required
def storage():
    storages = database.get_storages_by_user(user_id=session['id'])
    return render_template('content_list.html', 
                           search_context='Storages', 
                           list_name='All Storages', 
                           content_list=storages,
                           section_action="createStorage();",
                           counter='Item', 
                           resource='find_storage')

@app.route('/item')
@login_required
def item(): 
    items = database.get_items_by_user(user_id=session['id'])
    return render_template('content_list.html',
                           search_context='Items',
                           list_name='All Items',
                           content_list=items,
                           section_action="createItem();",
                           counter='Count',
                           resource='find_item')

@app.route('/find/storage')
@login_required
def find_storage():
    try:
        owner_id = request.args['owner']
        id = request.args['id']
        
        storage = database.get_storage(owner_id=owner_id, storage_id=id, user_id=session['id'])
        storage_list = database.get_storages_by_list(storage['subs'])
        item_list = database.get_items_by_list(storage['items'])
        return render_template('detail_storage.html', 
                               storage=storage, 
                               storage_list=storage_list, 
                               item_list=item_list, 
                               storage_id=id, 
                               owner_id=storage['owner_id'])
    except Exception as e:
        print(repr(e))
        return 'Error', 404

@app.route('/find/item')
@login_required
def find_item():
    try:
        owner_id = request.args['owner']
        id = request.args['id']
        
        item = database.get_item(owner_id, id, session['id'])
        print(item)
        return render_template('detail_item.html', item=item, item_id=id, owner_id=item['owner_id'])
    except Exception as e:
        print(repr(e))
        return 'Error', 404   

@app.route('/quick-action')
@login_required
def quick():
    contents = database.get_quick(session['id'])
    print(contents)
    
    return render_template('quick.html', content_list=contents)

@app.route('/search')
@login_required
def search_result():
    query = ''
    if 'q' in request.args:
        query = request.args['q']
        
    query_storages = database.search_storage(session['id'], query)
    query_items = database.search_item(session['id'], query)
    print(query_storages)
    print(query_items)
    
    return render_template('search_result.html', query=query, storage_list=query_storages, item_list=query_items)

#####################################################################################################
##########                                 API FUNCTIONS                                   ##########
#####################################################################################################

@app.route('/api/all-storage')
@api_verification
def api_all_storage():
    storages = database.get_storages_by_user(user_id=session['id'])
    print(storages)
    return storages

@app.route('/api/storage')
@api_verification
def get_storage():
    try:
        owner_id = request.args['owner']
        storage_id = request.args['id']
        
        if not owner_id or not storage_id:
            raise Exception
        
        storage = database.get_storage(owner_id, storage_id, session['id'])
        print(storage)
        return storage or ''
    except Exception as e:
        print(repr(e))
        return 'Unable to find storage', 400

@app.route('/api/storage/create', methods=['POST'])
@api_verification
def create_storage():
    storage_id = str(uuid.uuid4())
    name = request.form.get('storage-name')
    user_id = session['id']
    description = request.form.get('description') or ''
    tags = list(filter(None, request.form.getlist('tag')))
    
    parent_storage_id = request.form.get('parent-storage')
    parent_owner_id = request.form.get('parent-owner')
    
    storage_data = {
        'id': storage_id,
        'owner_id': user_id,
        'name': name,
        'description': description,
        'tags': tags,
        'subs': [],
        'items': [],
        'editors':[],
        'pinned': []
    }
    
    try:
        if not name or not (parent_storage_id and parent_owner_id or (not parent_storage_id)):
            raise Exception
        if parent_owner_id:
            storage_data['owner_id'] = parent_owner_id
            storage_data['parent_id'] = parent_storage_id
            
        database.create_storage(storage_data, user_id)
    except CosmosHttpResponseError as cosmose:
        return 'Storage already exsists', 400
    except Exception as e:
        print(repr(e))
        return 'Bad Request', 400
    
    return 'Storage Created'
    
@app.route('/api/storage/edit', methods=['POST'])
@api_verification
def edit_storage():
    storage_id = request.form.get('id')
    owner_id = request.form.get('owner-id')
    name = request.form.get('storage-name')
    description = request.form.get('description') or ''
    tags = list(filter(None, request.form.getlist('tag')))
    
    storage_data = {
        'id': storage_id,
        'owner_id': owner_id,
        'name': name,
        'description': description,
        'tags': tags
    }
    
    try:
        if not storage_id or not owner_id or not name: 
            raise Exception()
        database.edit_storage(storage_data, session['id'])
        return 'Storage Edited'
    except CosmosHttpResponseError as comsmose:
        return 'Storage not found', 404
    except Exception as e:
        print(repr(e))
        return 'Bad inputs', 400
    
@app.route('/api/storage/delete', methods=['POST'])
@api_verification
def delete_storage():
    storage_id = request.form.get('id')
    owner_id = request.form.get('owner-id')
    
    try:
        if not storage_id or not owner_id:
            raise Exception('Empty id or owner id')
        database.delete_storage(owner_id, storage_id, session['id'])
        return 'Storage Deleted'
    except Exception as e:
        print(repr(e))
        return 'Unknown error occured', 400

@app.route('/api/storage/permission/<method>', methods=['POST'])
@api_verification
def modify_permission(method):
    try:
        id = request.form.get('id')
        owner_id = request.form.get('owner-id')
        user_id = session['id']
        target_user = request.form.get('target-user')
        target_email = request.form.get('target-email')
        
        if method == 'add':
            database.add_storage_permission(id, owner_id, user_id, target_email)
            return 'Added storage permission'
        elif method == 'remove':
            database.remove_storage_permission(id, owner_id, user_id, target_user)
            return 'Remove storage permission'
        return 'Not Found', 404
    except Exception as e:
        print(repr(e))
        return repr(e), 400

@app.route('/api/item/all')
@api_verification
def api_all_item():
    items = database.get_items_by_user(session['id'])
    return items

@app.route('/api/item')
@api_verification
def get_item():
    try:
        owner_id = request.args['owner']
        item_id = request.args['id']
        
        if not owner_id or not item_id:
            raise Exception
        
        item = database.get_item(owner_id, item_id, session['id'])
        #print(storage)
        return item
    except Exception as e:
        print(repr(e))
        return 'Unable to find storage', 400

@app.route('/api/item/create', methods=['POST'])
@api_verification
def create_item():
    item_id = str(uuid.uuid4())
    name = request.form.get('item-name')
    user_id = session['id']
    description = request.form.get('description') or ''
    tags = list(filter(None, request.form.getlist('tag')))
    
    parent_storage_id = request.form.get('parent-storage')
    parent_owner_id = request.form.get('parent-owner')
    
    item_data = {
        'id': item_id,
        'owner_id': parent_owner_id,
        'name': name,
        'description': description,
        'tags': tags,
        'parent_id': parent_storage_id,
        'groups': [],
        'editors':[],
        'quick': []
    }
    
    try:
        if not name or not parent_owner_id or not parent_storage_id:
            raise Exception
        
        database.create_item(item_data, user_id)
    except CosmosHttpResponseError as cosmose:
        return 'Item already exsists', 400
    except Exception as e:
        print(repr(e))
        return 'Bad inputs', 400
    
    return 'Item Created'

@app.route('/api/item/edit', methods=['POST'])
@api_verification
def edit_item():
    item_id = request.form.get('id')
    owner_id = request.form.get('owner-id')
    name = request.form.get('item-name')
    description = request.form.get('description') or ''
    tags = list(filter(None, request.form.getlist('tag')))
    groups = list(filter(None, request.form.getlist('group')))
    edit_groups = request.form.get('edit-group', False, type=bool)
    
    item_data = {
        'id': item_id,
        'owner_id': owner_id,
        'name': name,
        'description': description,
        'tags': tags,
        'groups': []
    }
    
    try:     
        if edit_groups:
            for group in groups:
                print(group)
                json_group = json.loads(group)
                print(json_group)
                
                if any(field not in json_group for field in database.GROUP_KEY):
                    raise Exception
                
                # Check if Field is valid
                if type(json_group['count']) is not int:
                    raise Exception('Count is not integer')
                if json_group['count'] < 1:
                    continue
                
                datetime.date.fromisoformat(json_group['exp'])
                item_data['groups'].append(json_group)   
        
        if not item_id or not owner_id or not name: 
            raise Exception('Missing fields')
        
        database.edit_item(item_data, session['id'])
        return 'Storage Edited'
    except CosmosHttpResponseError as comsmose:
        return 'Item not found', 404
    except Exception as e:
        return repr(e), 400
    
@app.route('/api/item/delete', methods=['POST'])
@api_verification
def delete_item():
    item_id = request.form.get('id')
    owner_id = request.form.get('owner-id')
    
    try:
        database.delete_item(owner_id, item_id, session['id'])
        return 'Item deleted'
    except CosmosResourceNotFoundError:
        return 'Item not found', 404
    except Exception as e:
        print(repr(e))
        return 'Fail to delete item', 400
    
@app.route('/api/user/<resource>')
@api_verification
def get_users(resource):
    try:
        owner_id = request.args['owner']
        id = request.args['id']
        content = None
        if resource == 'storage':
            content = database.get_storage(owner_id, id, session['id'])
        elif resource == 'item':
            content = database.get_item(owner_id, id, session['id'])

        target_list = [content['owner_id']] + content['editors']
        return {
            'user_id': session['id'],
            'contents': database.get_users_by_list(target_list)}
    except Exception as e:
        print(repr(e))
        return repr(e), 400

@app.route('/api/pinned')
@api_verification
def get_pinned():
    try:
        content = database.get_pinned(session['id'])
        return content
    except Exception as e:
        print(repr(e))
        return str(repr(e)), 400

@app.route('/api/pinned/edit', methods=['POST'])
@api_verification
def edit_pinned():
    pinned_list = request.form.getlist('pinned')
    try:
        print(pinned_list)
        database.edit_pinned(session['id'], pinned_list)
        return 'Edited Pinned'
    except Exception as e:
        print(repr(e))
        return str(repr(e)), 400
    
@app.route('/api/quick')
@api_verification
def get_quick():
    try:
        content = database.get_quick(session['id'])
        return content
    except Exception as e:
        print(repr(e))
        return str(repr(e)), 400

@app.route('/api/quick/edit', methods=['POST'])
@api_verification
def edit_quick():
    quick_list = request.form.getlist('quick')
    try:
        print(quick_list)
        database.edit_quick(session['id'], quick_list)
        return 'Edited Pinned'
    except Exception as e:
        print(repr(e))
        return str(repr(e)), 400

#####################################################################################################
##########                                LOGIN FUNCTIONS                                  ##########
#####################################################################################################

@app.route('/login')
def login():
    auth_url, state = flow.authorization_url()
    session['state'] = state
    return render_template('login.html', auth_url=auth_url)
         

@app.route('/callback')
def callback():
    if not session['state'] == request.args['state']:
        abort(500)
    
    flow.fetch_token(authorization_response=request.url)
    credentials = flow.credentials
    request_session = requests.session()
    cached_session = cachecontrol.CacheControl(request_session)
    token_request = google.auth.transport.requests.Request(session=cached_session)
    
    try:
        id_info = id_token.verify_oauth2_token(
            id_token=credentials._id_token,
            request=token_request,
            audience=flow.client_config['client_id']
        )
        print('Token Verified')
        #print(f'Token: {id_info}')
        
        profile_info = flow.authorized_session().get('https://www.googleapis.com/userinfo/v2/me').json()
        print(profile_info)

        session['name'] = profile_info['name']
        session['id'] = profile_info['id']
        session['email'] = profile_info['email']
        session['picture'] = profile_info['picture']

    except Exception as e:
        print('Error on token verification')
        print(repr(e))
        print('Clearing session')
        session.clear()
        abort(400)
        
    try:
        database.create_user(session['id'], session['email'], session['name'], session['picture'])
        print('New account created')
    except Exception as e:
        pass
    
    session.pop('picture')
        
    print('Logging Successful')
    print(f"User's id is {session['id']}")
    print(f"User's email is {session['email']}")
    return redirect(url_for('index'))
   
@app.route('/logout')
def logout():
    session.clear()
    print('Session Cleared')
    return redirect(url_for('login'))

#####################################################################################################
##########                               ERROR FUNCTIONS                                   ##########
#####################################################################################################

@app.errorhandler(400)
def bad_request():
    render_template('error.html', error='Bad Request', err_msg='One or more of the inputs are invallid'), 400

@app.errorhandler(404)
def not_found():
    render_template('error.html', error='Page not found', err_msg='Unable to find the specified resource'), 404

@app.errorhandler(502)
def server_err():
    render_template('error.html', error='Server Error', err_msg='Something unexpected happend to the server'), 502

#####################################################################################################
##########                                MISC FUNCTIONS                                   ##########
#####################################################################################################

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                               'favicon.ico', mimetype='image/vnd.microsoft.icon')

@app.route('/plus-square.svg')
def plus_square():
    return send_from_directory(os.path.join(app.root_path, 'static/images'),
                               'plus-square.svg')

@app.route('/trash-icon.svg')
def trash_icon():
    return send_from_directory(os.path.join(app.root_path, 'static/images'),
                               'trash-2.svg')

@app.template_filter()
def time_format(time):
    return datetime.datetime.strptime(time, '%Y-%m-%d').strftime('%m-%d-%Y')

@app.template_filter()
def exp_warning(value):
    soonest_str = soon_exp(value)
    if soonest_str == 'N/A':
        return 'display:none;'
    
    soonest = datetime.datetime.strptime(soonest_str, '%m-%d-%Y')
    exp_warning_date = datetime.datetime.today() + datetime.timedelta(days=7)
    if soonest > exp_warning_date:
        return 'display:none;'
    else:
        return ''

@app.template_filter()
def get_exp_list(item_list):
    if len(item_list) == 0:
        return []
    
    expiring_list = []
    for item in item_list:
        if len(exp_warning(item['groups'])) == 0:
            expiring_list.append(item)
    
    return expiring_list

@app.template_filter()
def soon_exp(value):
    if len(value) == 0:
        return 'N/A'
    
    soonest = datetime.datetime.strptime(value[0]['exp'], '%Y-%m-%d')
    
    for date in [group['exp'] for group in value]:
        compare = datetime.datetime.strptime(date, '%Y-%m-%d')
        
        if soonest > compare:
            soonest = compare
            
    return soonest.strftime('%m-%d-%Y')

if __name__ == '__main__':
    app.run(debug=True)
