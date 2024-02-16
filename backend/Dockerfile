FROM golang:1.21 AS builder

WORKDIR /src
COPY . .
RUN go mod download
RUN CGO_ENABLED=1 GOOS=linux go build -o /app --tags "fts5" -a -ldflags '-linkmode external -extldflags "-static"' .

FROM busybox:1.36-musl

# Copy metaploy configuration
COPY metaploy/iqps.metaploy.conf /
COPY metaploy/postinstall.sh /

# Set the postinstall script as executable
RUN chmod +x /postinstall.sh

# Copy the binary from the builder
COPY --from=builder /app /app

# Copy .env file
COPY .env /

# Run postinstall script and the binary
CMD ["/postinstall.sh", "/app"]