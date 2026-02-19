def process_and_chunk(raw_file_bytes: bytes, metadata: dict):
    '''
    Takes the raw file bytes in from the download from iManage before
    processing them to text and returning a list of text chunks back.

    Metadata is provided as a courtesy parameter in case any values can
    be used to more intelligently process / chunk the data as well as knowing
    what type of file the bytes are.
    '''

    return [
        "This is the first section of a file.",
        "Here is the extracted text: Lorem Ipsum."
    ]