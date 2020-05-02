import json
import fcntl
import os
import string
from pdf2image import convert_from_path
from sklearn.feature_extraction.text import TfidfVectorizer
from nltk.corpus import stopwords
from nltk import word_tokenize
import pytesseract
from PIL import Image

CORPUS = []

def load_corpus():
    global CORPUS
    if os.path.exists("corpus.dat"):
        try:
            with open("corpus.dat", "r") as f:
                fcntl.lockf(f, fcntl.LOCK_EX)
                CORPUS = list(json.load(f))
                os.fsync(f.fileno())
                fcntl.lockf(f, fcntl.LOCK_UN)
        except Exception as e:
            print(e)
            CORPUS = []
            with open("corpus.dat", "w") as f:
                fcntl.lockf(f, fcntl.LOCK_EX)
                json.dump(CORPUS, f)
                os.fsync(f.fileno())
                fcntl.lockf(f, fcntl.LOCK_UN)

def append_corpus(new_corpus):
    """
    Use this method to avoid race conditions.
    """
    global CORPUS
    if os.path.exists("corpus.dat"):
        with open("corpus.dat", "r+") as f:
            fcntl.lockf(f, fcntl.LOCK_EX)
            CORPUS = list(json.load(f))
            f.truncate(0)
            CORPUS.extend(new_corpus)
            json.dump(CORPUS, f)
            os.fsync(f.fileno())
            fcntl.lockf(f, fcntl.LOCK_UN)
    else:
        with open("corpus.dat", "w") as f:
            fcntl.lockf(f, fcntl.LOCK_EX)
            json.dump(list(new_corpus), f)
            os.fsync(f.fileno())
            fcntl.lockf(f, fcntl.LOCK_UN)

def extract_text(path):
    """
    Takes the pdf file from fpath and extracts text from it.
    """
    text = ""
    pages = convert_from_path(path, 500)
    for page in pages:
        text += str(pytesseract.image_to_string(page))
    return text
    
def extract_keyword(text, dry_run=False, commit=True):
    load_corpus()

    text = text.lower()
    for char in string.punctuation:
        text = text.replace(char, " ")
    text = word_tokenize(text)
    stoppers = set(stopwords.words('english'))
    text = " ".join([w for w in text if w not in stoppers])
        
    CORPUS.append(text)
    
    if commit:
        append_corpus([text])
    if not dry_run:
        vectorizer = TfidfVectorizer()
        vectors = vectorizer.fit_transform(CORPUS)

        feature_names = vectorizer.get_feature_names()
        dense = vectors.todense()

        denselist = dense.tolist()
        print(denselist)
        threshold = sum([sum(x) for x in denselist])
        threshold = threshold / len(denselist[0]) * 0.3
        tfidf_row = list(zip(feature_names, denselist[-1]))

        keywords = [x[0] for x in tfidf_row if x[1] > threshold]
        return keywords
    else:
        return []


