Design and Architecture
#######################

Tech-Stack
==========

- Django

- MySQL

Algorithms for searching
========================

2 algorithms are used:

- Partial_token_ratio (for SQLite)

- Soundex (for MySQL)

While searching, Network calls are reduced by using Debouncing.

Keyword Generation Process
==========================

First the pdf file is passed through Tesseract OCR to generate text.

Then this text is word tokenized and stopwords are removed.

Then the bag of words is transferred to a dictionary where such bags are indexed by their paper ids.

Then TF-IDF algorithm is run to find keywords.
(RAKE provides worse results)

This must run locally as:

1. This is resource-heavy.

2. The threshold of keeping the keywords must be determined by human beings. This cannot be automated.

Retraining of model must be done once per semester. 
