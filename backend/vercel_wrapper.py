import os
import sys
import json
import io
from werkzeug.wrappers import Request, Response

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def handler(event, context):
    try:
        # Import the Flask app inside the handler to avoid initialization issues
        from flask_app import app
        
        # Convert Vercel event to WSGI environ
        environ = create_wsgi_environ(event, context)
        
        # Process the request through Flask using the WSGI interface
        response = Response.from_app(app, environ)
        
        # Convert Flask response to Vercel format
        return {
            'statusCode': response.status_code,
            'headers': dict(response.headers),
            'body': response.get_data(as_text=True)
        }
    except Exception as e:
        # Log the error for debugging
        print(f"Vercel handler error: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # Return a proper error response
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'error': 'Internal Server Error',
                'message': str(e)
            })
        }

def create_wsgi_environ(event, context):
    """Create a WSGI environ dict from Vercel event"""
    # Get request data
    method = event.get('method', 'GET')
    path = event.get('path', '/')
    query_string = event.get('queryString', '')
    headers = event.get('headers', {})
    body = event.get('body', '')
    
    # Create environ dict
    environ = {
        'REQUEST_METHOD': method,
        'PATH_INFO': path,
        'QUERY_STRING': query_string,
        'CONTENT_TYPE': headers.get('content-type', ''),
        'CONTENT_LENGTH': str(len(body.encode()) if isinstance(body, str) else len(body)),
        'SERVER_NAME': 'localhost',
        'SERVER_PORT': '443' if headers.get('x-forwarded-proto') == 'https' else '80',
        'SERVER_PROTOCOL': 'HTTP/1.1',
        'wsgi.version': (1, 0),
        'wsgi.url_scheme': headers.get('x-forwarded-proto', 'http'),
        'wsgi.input': io.BytesIO(body.encode() if isinstance(body, str) else body),
        'wsgi.errors': sys.stderr,
        'wsgi.multithread': False,
        'wsgi.multiprocess': False,
        'wsgi.run_once': True,
        'wsgi.async': False,
    }
    
    # Add HTTP headers
    for key, value in headers.items():
        environ[f'HTTP_{key.upper().replace("-", "_")}'] = value
    
    return environ