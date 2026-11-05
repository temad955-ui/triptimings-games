# Trip Timings Games Hub — static site image
# Build context: this folder (games-platform/).
#   docker build -t triptimings-games .
#   docker run -p 8080:8080 triptimings-games
FROM nginxinc/nginx-unprivileged:1.27-alpine

LABEL org.opencontainers.image.title="Trip Timings Games Hub" \
      org.opencontainers.image.description="Lobby + 5 HTML5 games with Trip Timings cross-promotion"

# Replace the default server block with ours
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf

# Static site
COPY --chown=nginx:nginx site/ /usr/share/nginx/html/

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
