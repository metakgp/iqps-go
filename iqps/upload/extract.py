import json
from download import download
from pdf2image import convert_from_path
from sklearn.feature_extraction.text import TfidfVectorizer
import pandas as pd
import pytesseract
from PIL import Image

corpus = []

data_full = json.load(open("data.json", "r"))
links = [a["Link"] for a in data_full]

i = 1
while i <= 10:
    try:
        path = download(links[-i], "./dat.pdf", replace=True, progressbar=True)
        pages = convert_from_path(path, 500)
        for page in pages:
            page.save("pdfpic.jpg", "JPEG")
            corpus.append(str(pytesseract.image_to_string(Image.open("pdfpic.jpg"))))
            print(corpus[-1])
    except Exception as e:
        print(i, e)
    finally:
        i += 1

vectorizer = TfidfVectorizer()
vectors = vectorizer.fit_transform(corpus)

feature_names = vectorizer.get_feature_names()

dense = vectors.todense()
denselist = dense.tolist()

df = pd.DataFrame(denselist, columns=feature_names)

