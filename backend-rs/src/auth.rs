use std::collections::BTreeMap;

use hmac::{self, Hmac, Mac};
use jwt::VerifyWithKey;
use sha2::{self, Sha256};

use crate::routing;

async fn verify_token(token: &String, jwt_secret: &String) -> Result<bool, routing::AppError> {
    let key: Hmac<Sha256> = Hmac::new_from_slice(jwt_secret.as_bytes()).unwrap();
    let claims: Result<BTreeMap<String, String>, _> = token.verify_with_key(&key);

    Ok(claims.is_ok())
}
