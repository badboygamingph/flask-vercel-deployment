"""
Test file to verify Vercel deployment fixes
"""

def test_handler():
    """Mock test to verify handler function works"""
    class MockRequest:
        def __init__(self):
            self.method = 'GET'
            self.path = '/'
            self.query_string = b''
            self.headers = {}
            self.body = b''
    
    class MockContext:
        pass
    
    try:
        from vercel_wrapper import handler
        request = MockRequest()
        context = MockContext()
        result = handler(request, context)
        print("Handler test passed")
        return True
    except Exception as e:
        print(f"Handler test failed: {e}")
        return False

if __name__ == "__main__":
    test_handler()