import azure.functions as func
import logging
import json
import requests
import os


app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

@app.route(route="search", auth_level=func.AuthLevel.ANONYMOUS, methods=["POST"])
def search(req: func.HttpRequest) -> func.HttpResponse:

    # Check that authorization token is at least present (regardless of validitiy) or return 401
    auth_header = req.headers.get('Authorization')
    if not auth_header:
        return func.HttpResponse("Unauthorized: Missing Bearer Token", status_code=401)

    # Parse incoming data
    try:
        req_body = req.get_json()
    except ValueError:
        return func.HttpResponse("Invalid JSON", status_code=400)

    # Grab the query and filters
    # Note get() will return NoneType if key isn't present
    query = req_body.get('query')
    filters = req_body.get('filters', {})
    
    # If "query" wasn't included, we don't have anything to go off of, return 400
    if not query:
        return func.HttpResponse("Missing 'query' parameter.", status_code=400)

    if filters:
        if type(filters) != dict:
            return func.HttpResponse("Improperly formatted filters. Filters must be a dictionary.", status_code=400)

    # # Remove empty filters
    # search_payload["filters"] = {k: v for k, v in search_payload["filters"].items() if v}

    # search_url = f"{IMANAGE_BASE_URL}/work/api/v2/customers/{CUSTOMER_ID}/libraries/{LIBRARY_ID}/documents/search"
    
    # # EXECUTE SEARCH REQUEST
    # # Note: In a real deployment, uncomment the requests.post line
    # # resp = requests.post(search_url, json=search_payload, headers=headers)
    # # search_data = resp.json()
    
    # # --- MOCK DATA (FOR TESTING WITHOUT LIVE IMANAGE) ---
    # search_data = {
    #     "data": [
    #         {"id": f"{LIBRARY_ID}!1001", "name": "Summary Judgment Motion.pdf", "size": 1024},
    #         {"id": f"{LIBRARY_ID}!1002", "name": "Vendor Contract v2.docx", "size": 2048},
    #         {"id": f"{LIBRARY_ID}!1003", "name": "Deposition Transcript.txt", "size": 512},
    #         {"id": f"{LIBRARY_ID}!1004", "name": "Irrelevant Email.msg", "size": 12}
    #     ]
    # }
    # # ----------------------------------------------------

    # results = search_data.get('data', [])

    # # 4. Step B: RETRIEVE CONTENT (Conditional)
    # if include_content and results:
    #     # Slice to the safety limit
    #     top_results = results[:MAX_RETRIEVAL]
    #     logging.info(f"Downloading content for top {len(top_results)} documents...")

    #     for doc in top_results:
    #         doc_id = doc.get('id')
    #         try:
    #             # Construct Download URL
    #             download_url = f"{IMANAGE_BASE_URL}/work/api/v2/customers/{CUSTOMER_ID}/libraries/{LIBRARY_ID}/documents/{doc_id}/download"
                
    #             # REAL DOWNLOAD:
    #             # file_resp = requests.get(download_url, headers=headers)
    #             # doc['text_content'] = extract_text(file_resp.content) # You would need a helper function here
                
    #             # MOCK DOWNLOAD:
    #             doc['text_content'] = f"--- FULL TEXT OF {doc['name']} ---\n(Simulated) This document discusses {query}. It contains clauses regarding indemnity and liability..."
                
    #         except Exception as e:
    #             doc['text_content'] = f"Error retrieving file: {str(e)}"
        
    #     # Update the main list with our enriched results
    #     results = top_results

    # # 5. Return JSON to ChatGPT
    # return func.HttpResponse(
    #     json.dumps({
    #         "count": len(results),
    #         "results": results,
    #         "note": "Content included" if include_content else "Metadata only"
    #     }),
    #     mimetype="application/json",
    #     status_code=200
    # )



    return func.HttpResponse(
        json.dumps({
            "some": 4,
        }),
        mimetype="application/json",
        status_code=200
    )