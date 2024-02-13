FROM golang:1.21 AS builder

# Copy metaploy configuration
COPY metaploy/iqps.metaploy.conf /
COPY metaploy/postinstall.sh /

WORKDIR /src
COPY . .
RUN go mod download
RUN CGO_ENABLED=1 GOOS=linux go build -o /app -a -ldflags '-linkmode external -extldflags "-static"' .

FROM busybox:1.36-musl
COPY --from=builder /app /app
EXPOSE 5000

# Run postinstall script and the binary
CMD ["/postinstall.sh", "/app"]