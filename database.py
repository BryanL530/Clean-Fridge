from azure.cosmos import CosmosClient
from azure.cosmos.container import ContainerProxy
from azure.cosmos.exceptions import CosmosClientTimeoutError, CosmosResourceNotFoundError, CosmosHttpResponseError

URL = 'REPLACE WITH URL'
KEY = 'REPLACE WITH AZURE KEY'
DB_ID = 'cf-db'
STORAGE_ID = 'cf-storage'
ITEM_ID = 'cf-item'
USER_ID = 'cf-user'
GROUP_KEY = ['name', 'count', 'exp']
DEBUG = True


client = None
database = None
storage = None
item = None
user = None

#####################################################################################################
##########                               GENERAL FUNCTIONS                                 ##########
#####################################################################################################
        
def connect_database():
    global client, database, storage, item, user
        
    try:
        client = CosmosClient(url=URL, credential=KEY)
        database = client.get_database_client(DB_ID)
        storage = database.get_container_client(STORAGE_ID)
        item = database.get_container_client(ITEM_ID)
        user = database.get_container_client(USER_ID)
    except CosmosClientTimeoutError:
        print('Timed out on connecting to database')
        client = None
        database = None
        storage = None
        item = None
        user = None
        raise Exception

def get(container: ContainerProxy | None, id, partition, user_id):
    try:
        content = container.read_item(item=id, partition_key=partition)
        content.pop('_rid', None)
        content.pop('_self', None)
        content.pop('_etag', None)
        content.pop('_attachments', None)
        content.pop('_ts', None)
        if container.id != USER_ID:
            check_permission(user_id, content)
        return content
    except CosmosHttpResponseError:
        print(f'Cannot find in {container.id}')
        raise Exception

def edit(container: ContainerProxy | None, content_data: dict, user_id):
    content = get(container=container, id=content_data['id'], partition=content_data['owner_id'], user_id=user_id)
    for key in content_data.keys():
        if key in content:
            content[key] = content_data[key]
    container.replace_item(item=content['id'], body=content)
    
def check_permission(user_id, content):
    if user_id != content['owner_id'] and user_id not in content['editors']:
        raise Exception('Unauthorized')
    
def check_list_permission(user_id, contents):   
    for content in contents:
        check_permission(user_id, content)
    
def add_permission(id, owner_id, user_id, target_email, container: ContainerProxy):
    if container.id == USER_ID:
        raise Exception('Illegal Operation')
    
    target_user = get_user_by_email(target_email)['id']
    content = get(container, id, owner_id, user_id)
    if target_user != content['owner_id'] and target_user not in content['editors']:
        content['editors'].append(target_user)
        container.replace_item(item=id, body=content)
        
        if container.id != STORAGE_ID:
            return
        
        # Edit permission for storages and items under this storage
        for item_data in get_items_by_list(content['items']):
            add_item_permission(id=item_data['id'], 
                                owner_id=item_data['owner_id'],
                                user_id=user_id,
                                target_email=target_email)
        
        for storage_data in get_storages_by_list(content['subs']):
            add_storage_permission(id=storage_data['id'],
                                   owner_id=storage_data['owner_id'],
                                   user_id=user_id,
                                   target_email=target_email)

def remove_permission(id, owner_id, user_id, target_user, container: ContainerProxy):
    if container.id == USER_ID:
        raise Exception('Illegal Operation')
    
    content = get(container, id, owner_id, user_id)
    if target_user == content['owner_id']:
        raise Exception('Removing owner is not allowed')
    if target_user not in content['editors']:
        raise Exception('Target Id not found')
    
    # Removing User's permission
    content['editors'].remove(target_user)
    if target_user in content['pinned']:
        content['pinned'].remove(target_user)
    container.replace_item(item=id, body=content)
    
    if container.id != STORAGE_ID:
        return
    
    # Edit permission for storages and items under this storage
    for item_data in get_items_by_list(content['items']):
        remove_item_permission(id=item_data['id'], 
                                owner_id=item_data['owner_id'],
                                user_id=user_id,
                                target_user=target_user)
    
    for storage_data in get_storages_by_list(content['subs']):
        remove_storage_permission(id=storage_data['id'],
                                owner_id=storage_data['owner_id'],
                                user_id=user_id,
                                target_user=target_user)

def search(user_id, query, container: ContainerProxy, query_fields):
    contents = list(container.query_items(
        query=( f'{query_fields}'
                f'FROM c WHERE (c.owner_id=@id or ARRAY_CONTAINS(c.editors, @id)) AND '
                f'CONTAINS(c.name, @q, true) '
                f'ORDER BY c.name'
        ),
        parameters=[
            { "name":"@id", "value": user_id },
            { "name":"@q", "value": query }
        ],
        enable_cross_partition_query=True                                  
                                          ))
    return contents

#####################################################################################################
##########                               STORAGE FUNCTIONS                                 ##########
#####################################################################################################

def get_storage(owner_id, storage_id, user_id):
    return get(storage, id=storage_id, partition=owner_id, user_id=user_id)

def get_storages_by_list(storage_list):
    if len(storage_list) == 0:
        return []
    contents = list(storage.query_items(
        query=(f"SELECT s.id, s.owner_id, s.name, ARRAY_LENGTH(s.items) AS count, s.tags, s.editors, s.pinned "
               f"FROM s WHERE s.id IN ({str(storage_list)[1:-1]}) ORDER BY s.name"),
        parameters=[],
        enable_cross_partition_query=True
    ))
    return contents

def get_storages_by_user(user_id):
    contents = list(storage.query_items(
        query=('SELECT r.id, r.owner_id, r.name, r.tags, ARRAY_LENGTH(r.items) AS count, r.editors, r.pinned '
               f'FROM r WHERE r.owner_id=@id or ARRAY_CONTAINS(r.editors, @id) ORDER BY r.name'),
        parameters=[
            { "name":"@id", "value": user_id }
        ],
        enable_cross_partition_query=True
    ))
    return contents

def create_storage(storage_data:dict, user_id):
    if 'parent_id' in storage_data:
        parent = get_storage(storage_data['owner_id'], storage_data['parent_id'], user_id)
        parent['subs'].append(storage_data['id'])
        storage_data['editors'] = parent['editors']
        storage.replace_item(item=parent['id'], body=parent)
        
    storage.create_item(body=storage_data)

def edit_storage(storage_data:dict, user_id): 
    edit(storage, storage_data, user_id)

def delete_storage(owner_id, storage_id, user_id):
    target = get_storage(owner_id, storage_id, user_id)
    
    # Removing all items
    item_list = get_items_by_list(target['items'])
    for item_data in item_list:
        item.delete_item(item=item_data['id'], partition_key=item_data['owner_id'])
        
    # Recursively delete storage content    
    storage_list = get_storages_by_list(target['subs'])
    for storage_data in storage_list:
        delete_storage(storage_data['owner_id'], storage_data['id'], user_id)
    
    storage.delete_item(item=storage_id, partition_key=owner_id)

def add_storage_permission(id, owner_id, user_id, target_email):
    add_permission(id, owner_id, user_id, target_email, storage)

def remove_storage_permission(id, owner_id, user_id, target_user):
    remove_permission(id, owner_id, user_id, target_user, storage)

def search_storage(user_id, query):
    return search(user_id, query, storage, 
        (f"SELECT c.id, c.owner_id, c.name, ARRAY_LENGTH(c.items) AS count, c.tags "))

#####################################################################################################
##########                                 ITEM FUNCTIONS                                  ##########
#####################################################################################################

def get_item(owner_id, item_id, user_id):
    return get(item, id=item_id, partition=owner_id, user_id=user_id)
   
def get_items_by_list(item_list):
    if len(item_list) == 0:
        print('Empty List, No Query Required')
        return []
    
    list_str = str(item_list)[1:-1]
    contents = list(item.query_items(
        query= (f"SELECT i.id, i.name, i.owner_id, i.groups, i.tags, i.editors, i.quick, "
                f"(SELECT VALUE SUM(g.count) FROM g IN i.groups) AS count "
                f"FROM i WHERE i.id IN ({list_str}) ORDER BY i.name"),
        parameters=[],
        enable_cross_partition_query=True
    ))

    #print(contents)  
    return contents

def get_items_by_user(user_id):
    print(f'Query for Item by owner id: {user_id}')
    contents = list(item.query_items(
        query=("SELECT i.id, i.name, i.owner_id, i.tags, i.groups, i.editors, i.quick, "
               "(SELECT VALUE SUM(g.count) FROM g IN i.groups) AS count "
               "FROM i WHERE i.owner_id=@id or ARRAY_CONTAINS(i.editors, @id) ORDER BY i.name"),
        parameters=[
            { "name":"@id", "value": user_id }
        ],
        enable_cross_partition_query=True
    ))
    #print(contents) 
    return contents

def create_item(item_data: dict, user_id):
    parent = get_storage(item_data['owner_id'], item_data['parent_id'], user_id)
    parent['items'].append(item_data['id'])
    item_data['editors'] = parent['editors']
    storage.replace_item(item=parent['id'], body=parent)
    item.create_item(body=item_data)

def edit_item(item_data:dict, user_id):
    edit(item, item_data, user_id)

def delete_item(owner_id, item_id, user_id):
    content = get_item(owner_id, item_id, user_id)
    parent = get_storage(content['owner_id'], content['parent_id'], user_id)
    if item_id in parent['items']:
        parent['items'].remove(item_id)
    storage.replace_item(item=parent['id'], body=parent)        
    item.delete_item(item=item_id, partition_key=owner_id)

def add_item_permission(id, owner_id, user_id, target_email):
    add_permission(id, owner_id, user_id, target_email, item)

def remove_item_permission(id, owner_id, user_id, target_user):
    remove_permission(id, owner_id, user_id, target_user, item)

def search_item(user_id, query):
    return search(user_id, query, item, (f"SELECT c.id, c.name, c.owner_id, c.tags, "
            f"(SELECT VALUE SUM(g.count) FROM g IN c.groups) AS count "))

#####################################################################################################
##########                                 USER FUNCTIONS                                  ##########
#####################################################################################################
   
def get_user(user_id, user_email):
    return get(user, id=user_id, partition=user_email, user_id=user_id)
    
def get_user_by_email(user_email):
    try:
        return list(user.query_items(
            query=f'SELECT u.id, u.email, u.name, u.picture FROM u WHERE u.email="{user_email}"',
            enable_cross_partition_query=True))[0]
    except Exception as e:
        raise Exception(f"User with email {user_email} doesn't exsist")

def get_users_by_list(user_list):
    contents = list(user.query_items(
        query=f'SELECT u.id, u.email, u.name, u.picture FROM u WHERE u.id IN ({str(user_list)[1:-1]})',
        enable_cross_partition_query=True))
    return contents

def create_user(user_id, user_email, user_name, user_picture):
    user_data = {
        'id': user_id,
        'email': user_email,
        'name': user_name,
        'picture': user_picture
    }
    
    user.create_item(body=user_data)
    
def edit_user_name(user_id, user_email, new_name):
    content = get_user(user_id, user_email)
    content['name'] = new_name
    user.replace_item(item=user_id, body=content)

def delete_user(user_id, user_email):
    print('Not yet impelmented - DELETE USER')
    pass

def get_pinned(user_id):
    contents = list(storage.query_items(
        query=(f'SELECT s.id, s.owner_id, s.name, ARRAY_LENGTH(s.items) AS count, s.tags, s.pinned, s.editors '
               f'FROM s WHERE (s.owner_id=@id OR ARRAY_CONTAINS(s.editors, @id)) AND ARRAY_CONTAINS(s.pinned, @id) ORDER BY s.name'),
        parameters=[
            { "name":"@id", "value": user_id }
        ],
        enable_cross_partition_query=True
    ))
    return contents

def edit_pinned(user_id, pinned_list=[]):
    contents = get_storages_by_user(user_id)
    for content in contents:
        if content['id'] not in pinned_list and user_id in content['pinned']:
            content['pinned'].remove(user_id)
            edit_storage(content, user_id)
        elif content['id'] in pinned_list and user_id not in content['pinned']:
            content['pinned'].append(user_id)
            edit_storage(content, user_id)
            
def get_quick(user_id):
    contents = list(item.query_items(
        query=(f'SELECT i.id, i.name, i.owner_id, i.tags, i.groups, i.editors, i.quick, '
               f'(SELECT VALUE SUM(g.count) FROM g IN i.groups) AS count '
               f'FROM i WHERE (i.owner_id=@id OR ARRAY_CONTAINS(i.editors, @id)) AND ARRAY_CONTAINS(i.quick, @id) ORDER BY i.name'),
        parameters=[
            { "name":"@id", "value": user_id }
        ],
        enable_cross_partition_query=True
    ))
    return contents

def edit_quick(user_id, quick_list=[]):
    contents = get_items_by_user(user_id)
    for content in contents:
        if content['id'] not in quick_list and user_id in content['quick']:
            content['quick'].remove(user_id)
            edit_item(content, user_id)
        elif content['id'] in quick_list and user_id not in content['quick']:
            content['quick'].append(user_id)
            edit_item(content, user_id)