import sqlite3
from fuzzywuzzy import fuzz


class SearchCursor:
    '''
    To be used with SQLite
    '''

    def __init__(self, db_name):
        self.db_name = db_name
        self.connection = None
        self.cursor = None

    @staticmethod
    def _similarityScore(s1, s2):
        return fuzz.token_set_ratio(s1, s2)

    def __enter__(self):
        self.connection = sqlite3.connect(self.db_name)
        self.connection.create_function("SIMILARITYSCORE", 2,
                                        self._similarityScore)
        self.cursor = self.connection.cursor()

        return self.cursor

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.cursor:
            self.cursor.close()
        if self.connection:
            self.connection.close()
