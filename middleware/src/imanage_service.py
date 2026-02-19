def get_search_results(query: str, filters: dict, auth_token: str):
    '''
    Queries the iManage API to get relevant search results.
    Each result should be a dictionary of metadata for a single file.
    The function returns a list of these dictionaries.

    ### Params
    `query` : A formatted string to pass into the keyword search
    `filters` : A dict of various parameters we want to set on the search (based on iManage API)
    `auth_token` : Auth token from Entra that should be used to authenticate into iManage
    '''

    # TODO - Complete document search. For now returns dummy dict.
    return [
        {
            "id": "mock-doc-123",
            "metadata": {
                "name": "Indemnity_Agreement.pdf",
                "author": "JDOE",
                "document_class": "CONTRACT"
            }
        },
        {
            "id": "mock-doc-456",
            "metadata": {
                "name": "Summary_Judgment.docx",
                "author": "ASMITH",
                "document_class": "PLEADING"
            }
        }
    ]

def download_document(doc_id: str, auth_token: str):
    '''Returns raw bytes of requested file'''
    
    return b"Fake binary file content for document: " + doc_id.encode('utf-8')