import pytest
import azure.functions as func
import json
from function_app import search

class TestSearchValidation:

    def create_request(self, body=None, headers={"Content-Type": "application/json", "Authorization": "Bearer valid-test-token"}):
        """Helper to build a clean Azure Request"""
        return func.HttpRequest(
            method='POST',
            body=json.dumps(body).encode('utf-8') if body else b'',
            url='/api/search',
            headers=headers
        )

    # --- Verify required values
    def test_rejects_empty_body(self):
        """Fail if the request body is completely empty"""
        req = self.create_request(body=None)
        resp = search(req)
        assert resp.status_code == 400
        assert "Invalid JSON" in resp.get_body().decode()

    def test_rejects_missing_query(self):
        """Fail if JSON is valid but 'query' param is missing"""
        req = self.create_request(body={"filters": {"class": "DOC"}})
        resp = search(req)
        assert resp.status_code == 400
        assert "Missing 'query'" in resp.get_body().decode()

    # --- Filters are optional but if they're provided, make sure they're formatted correctly

    def test_rejects_malformed_filters(self):
        """Fail if 'filters' is provided but is a string instead of a dict"""
        req = self.create_request(body={
            "query": "test", 
            "filters": "I am a string not a dict" # Bad Format
        })
        resp = search(req)
        assert resp.status_code == 400
        assert "must be a dictionary" in resp.get_body().decode()

    def test_proper_filters_format(self):
        req = self.create_request(body={
            "query": "test", 
            "filters": {
                "Author": "someone",
            } 
        })
        resp = search(req)
        assert resp.status_code == 200
    

    #  --- Auth gut checks (make sure token is there at least)
    def test_rejects_missing_auth_header(self):
        """Security: No token? 401 Unauthorized."""
        # Create request WITHOUT headers
        req = func.HttpRequest(
            method='POST',
            body=json.dumps({"query": "test"}).encode('utf-8'),
            url='/api/search',
            headers={} # Empty headers
        )
        
        resp = search(req)
        
        assert resp.status_code == 401
        assert "Missing Bearer Token" in resp.get_body().decode()

    def test_accepts_fake_token_presence(self):
        """
        Security: logic check.
        We provide a FAKE token. The Bouncer should let us through 
        (returning 200 or 400 depending on body), proving it found the header.
        It shouldn't return 401.
        """
        req = func.HttpRequest(
            method='POST',
            body=json.dumps({"query": "valid"}).encode('utf-8'),
            url='/api/search',
            headers={"Authorization": "Bearer purely-fake-string-for-testing"}
        )
        
        resp = search(req)
        
        # If it returns 200, it means it passed the Auth Check and the Body Check.
        # If it returns 401, our code is broken.
        assert resp.status_code == 200