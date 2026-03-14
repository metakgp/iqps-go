use duplicate::duplicate_item;
use sqlx::{postgres::PgTypeInfo, Postgres};

use crate::qp::{Exam, Semester};

// DO NOT ASK ME WHAT THE BELOW TRAIT IMPLEMENTATIONS DO
// I JUST KNOW THEY ARE NEEDED TO TEACH SQLX HOW TO DECODE AND ENCODE THIS SHIT
impl sqlx::Type<Postgres> for Exam {
    fn type_info() -> <Postgres as sqlx::Database>::TypeInfo {
        <String as sqlx::Type<Postgres>>::type_info()
    }
}

impl sqlx::Type<Postgres> for Semester {
    fn type_info() -> <Postgres as sqlx::Database>::TypeInfo {
        // Yes the init sql in queries.rs sets the type to `TEXT` but turns out the database has
        // `VARCHAR` type so idk what to do here
        PgTypeInfo::with_name("VARCHAR")
    }
}

#[duplicate_item(
    DBEncodeDecode;
    [ Exam ];
    [ Semester ];
)]
impl sqlx::Decode<'_, sqlx::Postgres> for DBEncodeDecode {
    fn decode(
        value: <sqlx::Postgres as sqlx::Database>::ValueRef<'_>,
    ) -> Result<Self, sqlx::error::BoxDynError> {
        Ok(Self::try_from(value.as_str()?)?)
    }
}

impl<'q> sqlx::Encode<'q, Postgres> for Exam {
    fn encode_by_ref(
        &self,
        buf: &mut <Postgres as sqlx::Database>::ArgumentBuffer<'q>,
    ) -> Result<sqlx::encode::IsNull, sqlx::error::BoxDynError> {
        <String as sqlx::Encode<'q, Postgres>>::encode_by_ref(&String::from(self), buf)
    }
}
