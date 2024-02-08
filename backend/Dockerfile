FROM golang:1.21 AS builder

WORKDIR /src
COPY . .
RUN go mod download
RUN CGO_ENABLED=1 GOOS=linux go build -o /app -a -ldflags '-linkmode external -extldflags "-static"' .

FROM busybox:1.36-musl
COPY --from=builder /app /app
EXPOSE 5000

ENTRYPOINT ["/app"]