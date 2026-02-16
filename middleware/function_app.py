import azure.functions as func
import logging
import json
# import requests
# import os
from src.imanage_service import get_search_results, download_document
from src.file_processor import process_and_chunk 


def soft_error(message: str) -> func.HttpResponse:
    """
    Helper to return HTTP 200 with an error payload for the GPT
    """
    # Note - returning standard error codes aren't compatible with 
    # ChatGPT. It doesn't read the error messages, just errors out.
    # So we can bypass this by returning an "OK" code but put the error
    # in the body so at least errors are able to be communicated to end user.
    return func.HttpResponse(
        json.dumps({"error": message}),
        mimetype="application/json",
        status_code=200
    )

app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

@app.route(route="search", auth_level=func.AuthLevel.ANONYMOUS, methods=["POST"])
def search(req: func.HttpRequest) -> func.HttpResponse:

    # Check that authorization token is at least present (regardless of validitiy) or return 401
    auth_header = req.headers.get('Authorization')
    if not auth_header:
        # return func.HttpResponse("Unauthorized: Missing Bearer Token", status_code=401)
        return soft_error("Unauthorized: Missing Bearer Token")

    # Parse incoming data
    try:
        req_body = req.get_json()
    except ValueError:
        # return func.HttpResponse("Invalid JSON", status_code=400)
        return soft_error("Invalid JSON payload format.")

    # Grab the query and filters
    # Note get() will return NoneType if key isn't present
    query = req_body.get('query')
    filters = req_body.get('filters', {})


    
    # If "query" wasn't included, we don't have anything to go off of, return 400
    if not query:
        # return func.HttpResponse("Missing 'query' parameter.", status_code=400)
        return soft_error("Missing 'query' parameter. Please provide a search topic.")

    if filters:
        if type(filters) != dict:
            # return func.HttpResponse("Improperly formatted filters. Filters must be a dictionary.", status_code=400)
            return soft_error("Improperly formatted filters. Filters must be a dictionary.")

    
    # If params pass initial gut check, let's try to process them
    try:
        # A. Lightweight Search (IDs and Metadata ONLY)
        search_results = get_search_results(query=query, filters=filters, auth_token=auth_header)
        
        if not search_results:
            # If we don't have any search results, we can already return
            return func.HttpResponse(json.dumps({"results": []}), mimetype="application/json", status_code=200)

        final_response_payload = []

        # Processing Loop (One file at a time)
        for file_record in search_results:
            doc_id = file_record['id']
            metadata = file_record['metadata']
            
            try:
                # Fetch the heavy file
                raw_file_bytes = download_document(doc_id, auth_token=auth_header)
                
                # Process and Chunk (Pass bytes in, get lightweight text chunks out)
                chunks = process_and_chunk(raw_file_bytes, metadata)

                # Make sure these are then added to the data dict for this file
                file_record["chunks"] = chunks
                
                # Add the result
                final_response_payload.append(file_record)
                
            except Exception as doc_error:
                logging.error(f"Failed to process doc {doc_id}: {doc_error}")
                # Append an error state so the client knows this specific file failed, but others might succeed
                final_response_payload.append({"id": doc_id, "error": "Processing failed"})
                
            finally:
                # Explicitly delete heavy variables to force garbage collection
                raw_file_bytes = None 

        # C. Return the aggregated lightweight data
        return func.HttpResponse(
            json.dumps({"results": final_response_payload}),
            mimetype="application/json",
            status_code=200
        )

    except Exception as e:
        logging.error(f"Server Error: {str(e)}")
        # return func.HttpResponse("Internal Server Error", status_code=500)
        return soft_error(f"Internal Server Error: {str(e)}")

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



    # return func.HttpResponse(
    #     json.dumps({
    #         "some": 4,
    #     }),
    #     mimetype="application/json",
    #     status_code=200
    # )