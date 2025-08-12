FROM rust:slim-bookworm AS builder

WORKDIR /src

# Install dependencies
RUN apt-get update
RUN apt-get install -y build-essential musl-dev musl-tools

# Copy all files
COPY src/ ./src
COPY metaploy/ ./metaploy
COPY Cargo.toml Cargo.lock .

# For static build
RUN rustup target add x86_64-unknown-linux-musl
RUN cargo build --target=x86_64-unknown-linux-musl --release

FROM alpine:latest AS app

RUN apk --no-cache add tzdata ca-certificates bash

ENV TZ="Asia/Kolkata"

WORKDIR /app

COPY metaploy/ ./

RUN chmod +x ./postinstall.sh

COPY --from=builder /src/target/x86_64-unknown-linux-musl/release/iqps-backend .
COPY --from=builder /src/target/x86_64-unknown-linux-musl/release/import-papers .

CMD ["./postinstall.sh", "./iqps-backend"]
