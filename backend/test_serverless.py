"""
Test file to verify serverless deployment fixes
"""

def test_handler():
    """Mock test to verify handler function works"""
    class MockEvent:
        def __init__(self):
            self.method = 'GET'
            self.path = '/'
            self.queryString = ''
            self.headers = {}
            self.body = ''
        
        def get(self, key, default=None):
            # Map the Vercel event structure to our mock
            mapping = {
                'method': self.method,
                'path': self.path,
                'queryString': self.queryString,
                'headers': self.headers,
                'body': self.body
            }
            return mapping.get(key, default)
    
    class MockContext:
        pass
    
    try:
        from vercel_wrapper import handler
        event = MockEvent()
        context = MockContext()
        result = handler(event, context)
        print("Handler test passed")
        print(f"Result: {result}")
        return True
    except Exception as e:
        print(f"Handler test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_handler()